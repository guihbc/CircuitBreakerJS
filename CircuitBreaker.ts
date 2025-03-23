import CircuitBreakerState from "./CircuitBreakerState";
import CircuitBreakerTimeoutError from "./CircuitBreakerTimeoutError";
import CircuitBreakerConfig from "./CircuitBreakerConfig";
import ICircuitBreaker from "./ICircuitBreaker";

export default class CircuitBreaker implements ICircuitBreaker {
    callFn: Function;
    config: CircuitBreakerConfig;
    state: CircuitBreakerState;
    errorCount: number;
    successCount: number;
    halfOpenAttempts: number;
    nextAttempt: number;

    /**
     * Circuit Breaker implementation
     * @param {Function} callFn 
     * @param {CircuitBreakerConfig} config
     */
    constructor(callFn: Function, config: CircuitBreakerConfig)  {
        this.callFn = callFn;
        this.config = config;
        
        this.errorCount = 0;
        this.successCount = 0;
        this.halfOpenAttempts = 0
        this.state = CircuitBreakerState.CLOSED;
        this.nextAttempt = Date.now();
    }

    /**
     * Execute the function applying the circuit braker pattern
     * @param {any} fallback - Fallback if the function fails
     * @param  {...any} args  - Arguments for the calling function
     * @returns {Promise<any>}
     */
    async execute(fallback: any, ...args: any): Promise<any> {
        const { OPEN, CLOSED, HALF_OPEN } = CircuitBreakerState;

        if (this.state === OPEN) {
            if (Date.now() >= this.nextAttempt) {
                this.state = HALF_OPEN;
                this.halfOpenAttempts = 0;
            } else {
                console.info('Circuit OPEN returning fallback');
                return fallback;
            }
        }

        if (this.state === HALF_OPEN && this.halfOpenAttempts > this.config.maxHalfOpenAttempts) {
            this.trip();
            return fallback;
        } else {
            this.halfOpenAttempts++;
        }

        try {
            const timeoutPromise = new Promise((resolve, _) => {
                setTimeout(() => resolve(new CircuitBreakerTimeoutError(this.config.timeout, this.callFn.name)), this.config.timeout);
            });

            const result = await Promise.race([this.callFn(...args), timeoutPromise]);

            if (result instanceof CircuitBreakerTimeoutError) {
                throw result;
            }

            this.reset();
            this.successCount++;
            return result;
        } catch(error: any) {
            this.errorCount++;
            const totalCount = this.successCount + this.errorCount;
            const errorRate = (this.errorCount/totalCount) * 100;

            console.warn(error.message);
            console.info(`Circuit Breaker error rate: ${errorRate}% | [${this.errorCount}/${this.successCount}] total: ${totalCount}`);

            if (errorRate >= this.config.percentThreshold &&
                (this.state === CLOSED || (this.state === HALF_OPEN && this.halfOpenAttempts > this.config.maxHalfOpenAttempts))) {
                this.trip();
            }

            return fallback;
        }
    }

    /**
     * Reset the counters, and the circuit braker state to CLOSED
     */
    private reset() {
        this.errorCount = 0;
        
        if (this.state === CircuitBreakerState.HALF_OPEN) {
            this.successCount = 0;
            this.halfOpenAttempts = 0;
        }

        this.state = CircuitBreakerState.CLOSED;
        console.info('Circuit Breaker State changed: CLOSED');
    }

    /**
     * Trip the circuit breaker changing its state to OPEN
     */
    private trip() {
        this.state = CircuitBreakerState.OPEN;
        this.nextAttempt = Date.now() + this.config.timeToRecover;
        console.warn('Circuit Breaker State changed: OPEN');
    }
}
