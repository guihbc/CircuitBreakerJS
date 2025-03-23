type CircuitBreakerConfig = {
    percentThreshold: number;
    timeout: number;
    timeToRecover: number;
    maxHalfOpenAttempts: number;
}

export default CircuitBreakerConfig;
