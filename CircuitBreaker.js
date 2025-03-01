const { CLOSED, OPEN, HALF_OPEN } = require('./CircuitBreakerState');
const CircuitBreakerTimeoutError = require('./CircuitBreakerTimeoutError');

/**
 * @typedef {Object} CircuitBreakerOptions
 * @property {Number} percentThreshold
 * @property {Number} timeout
 * @property {Number} timeToRecover
 * @property {Number} maxHalfOpenAttempts
 */

class CircuitBreaker {
    /**
     * Circuit Breaker implementation
     * @param {Function} callFn 
     * @param {CircuitBreakerOptions} options
     */
    constructor(callFn, options) {
        this.callFn = callFn;
        this.percentThreshold = options.percentThreshold;
        this.timeout = options.timeout;
        this.timeToRecover = options.timeToRecover;
        this.maxHalfOpenAttempts = options.maxHalfOpenAttempts;
        
        this.errorCount = 0;
        this.successCount = 0;
        this.halfOpenAttempts = 0
        this.state = CLOSED;
        this.nextAttempt = Date.now();
    }

    /**
     * Execute the function applying the circuit braker pattern
     * @param {any} fallback - Fallback if the function fails
     * @param  {...any} args  - Arguments for the calling function
     * @returns {any}
     */
    async execute(fallback, ...args) {
        if (this.state === OPEN) {
            if (Date.now() >= this.nextAttempt) {
                this.state = HALF_OPEN;
                this.halfOpenAttempts = 0;
            } else {
                return fallback;
            }
        }

        if (this.state === HALF_OPEN && this.halfOpenAttempts > this.maxHalfOpenAttempts) {
            this.trip();
            return fallback;
        }

        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new CircuitBreakerTimeoutError(this.timeout, this.callFn.name)), this.timeout);
            });

            const result = await Promise.race([this.callFn(...args), timeoutPromise]);
            this.reset();
            this.successCount++;
            return result;
        } catch(error) {
            this.errorCount++;
            const totalCount = this.successCount + this.errorCount;
            const errorRate = (this.errorCount/totalCount) * 100;
            console.log(`Circuit Breaker error rate: ${errorRate}%`);

            if (errorRate >= this.percentThreshold &&
                (this.state === CLOSED || (this.state === HALF_OPEN && this.halfOpenAttempts > this.maxHalfOpenAttempts))) {
                this.trip();
            }

            return fallback;
        }
    }

    /**
     * Reset the counters, and the circuit braker state to CLOSED
     */
    reset() {
        this.errorCount = 0;
        this.halfOpenAttempts = 0;
        
        if (this.state === HALF_OPEN) {
            this.successCount = 0;
        }

        this.state = CLOSED;
        console.log('Circuit Breaker State: CLOSED');
    }

    /**
     * Trip the circuit breaker changing its state to OPEN
     */
    trip() {
        this.state = OPEN;
        this.nextAttempt = Date.now() + this.timeToRecover;
        console.warn('Circuit Breaker State: OPEN');
    }
}
