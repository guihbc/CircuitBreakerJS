import CircuitBreakerState from "./CircuitBreakerState";
import CircuitBreakerTimeoutError from "./CircuitBreakerTimeoutError";
import CircuitBreakerConfig from "./CircuitBreakerConfig";
import CircuitBreaker from "./CircuitBreaker";

export default class SimpleCircuitBreaker extends CircuitBreaker {
    callFn: Function;
    config: CircuitBreakerConfig;
    state: CircuitBreakerState;
    errorCount: number;
    halfOpenAttempts: number;
    nextAttempt: number;

    /**
     * Circuit Breaker implementation
     * @param {Function} callFn 
     * @param {CircuitBreakerConfig} config
     */
    constructor(callFn: Function, config: CircuitBreakerConfig)  {
        super();
        this.callFn = callFn;
        this.config = config;
        
        this.errorCount = 0;
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
            return result;
        } catch(error: any) {
            this.errorCount++;
            
            console.error(error.message);
            console.info(`Circuit Breaker error count: ${this.errorCount}`);

            if (this.errorCount > this.config.threshold &&
                (this.state === CLOSED || (this.state === HALF_OPEN && this.halfOpenAttempts > this.config.maxHalfOpenAttempts))) {
                this.trip();
            }

            return fallback;
        }
    }
}
