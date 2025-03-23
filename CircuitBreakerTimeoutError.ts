export default class CircuitBreakerTimeoutError extends Error {
    constructor(timeout: Number, functionName: String) {
        super(`Timeout ${timeout}ms exceeded for ${functionName}`);
    }
}
