/*
circuit breaker options
{
  "percentThreshold": 5,
  "timeout": 3000,
  "timeToRecover": 60000,
  "maxHalfOpenAttempts": 3
}
*/

class CircuitBreaker {
    constructor(callFn, options) {
        this.callFn = callFn;
        this.percentThreshold = options.percentThreshold;
        this.timeout = options.timeout;
        this.timeToRecover = options.timeToRecover;
        this.maxHalfOpenAttempts = options.maxHalfOpenAttempts;
        
        this.errorCount = 0;
        this.successCount = 0;
        this.halfOpenAttempts = 0
        this.state = 'CLOSED';
        this.nextAttempt = Date.now();
    }

    async execute(fallback, ...args) {
        if (this.state === 'OPEN') {
            if (Date.now() >= this.nextAttempt) {
                this.state = 'HALF-OPEN';
                this.halfOpenAttempts = 0;
            } else {
                return fallback;
            }
        }

        if (this.state === 'HALF-OPEN' && this.halfOpenAttempts > this.maxHalfOpenAttempts) {
            this.trip();
            return fallback;
        }

        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("Timeout exceeded")), this.timeout);
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

            if (errorRate >= this.percentThreshold && (this.state === 'CLOSED' || (this.state === 'HALF-OPEN' && this.halfOpenAttempts > this.maxHalfOpenAttempts))) {
                this.trip();
            }

            return fallback;
        }
    }

    reset() {
        this.errorCount = 0;
        this.halfOpenAttempts = 0;
        
        if (this.state === 'HALF-OPEN') {
            this.successCount = 0;
        }

        this.state = 'CLOSED';
        console.log('Circuit Breaker State: CLOSED');
    }

    trip() {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.timeToRecover;
        console.warn('Circuit Breaker State: OPEN');
    }
}
