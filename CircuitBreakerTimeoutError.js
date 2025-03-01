class CircuitBreakerTimeoutError extends Error {
    constructor(timeout, functionName) {
        super(`Timeout ${timeout}ms exceeded for ${functionName}`);
    }
}
