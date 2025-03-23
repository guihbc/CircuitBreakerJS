import CircuitBreakerConfig from "./CircuitBreakerConfig";
import CircuitBreakerState from "./CircuitBreakerState";

/**
 * Abstract class to represent the CircuitBreaker
 */
export default abstract class CircuitBreaker {
    errorCount: number = 0;
    halfOpenAttempts: number = 0;
    nextAttempt: number = Date.now();
    state: CircuitBreakerState = CircuitBreakerState.CLOSED;
    
    protected config: CircuitBreakerConfig = {
        threshold: 0,
        timeout: 0,
        timeToRecover: 0,
        maxHalfOpenAttempts: 0
    };

    /**
     * Execute the function applying the circuit braker pattern
     * @param {any} fallback - Return fallback if the function fails
     * @param  {...any} args  - Arguments passed to the calling function
     * @returns {Promise<any>}
     */
    abstract execute(fallback: any, ...args: any): Promise<any>;
    
    /**
     * Reset the counters, and the circuit braker state to CLOSED
     */
    protected reset() {
        this.errorCount = 0;
        
        if (this.state === CircuitBreakerState.HALF_OPEN) {
            this.halfOpenAttempts = 0;
        }

        this.state = CircuitBreakerState.CLOSED;
        console.info('Circuit Breaker State: CLOSED');
    }

    /**
     * Trip the circuit breaker changing its state to OPEN
     */
    protected trip() {
        this.state = CircuitBreakerState.OPEN;
        this.nextAttempt = Date.now() + this.config.timeToRecover;
        console.warn('Circuit Breaker State: OPEN');
    }
}
