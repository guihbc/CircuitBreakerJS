/**
 * @property {number} threshold - Number of errors to OPEN the circuit
 * @property {number} timeout - Timeout for the function
 * @property {number} timeToRecover - Time in ms to try again after the circuit is opened
 * @property {number} maxHalfOpenAttempts - Max retries when the circuit is HALF_OPEN
 */
type CircuitBreakerConfig = {
    threshold: number;
    timeout: number;
    timeToRecover: number;
    maxHalfOpenAttempts: number;
}

export default CircuitBreakerConfig;
