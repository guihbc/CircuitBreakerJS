const CircuitBreaker = require('../CircuitBreaker');

const testFn = (counter = 1) => {
    if (counter > 3) throw Error('Unexpected Error');
    return 'SUCCESS';
}

const timeoutTestFn = () => {
    return new Promise(resolve => setTimeout(() => resolve('SUCCESS'), 200));
}

test('should return fallback when circuit breaker is tripped', async () => {
    const testCircuitBreaker = new CircuitBreaker(testFn, {
        percentThreshold: 30,
        timeout: 500,
        timeToRecover: 60000,
        maxHalfOpenAttempts: 1
    });

    for (let i = 1; i <= 10; i++) {
        const result = await testCircuitBreaker.execute('ERROR', i);
        const expectedResult = i <= 3 ? 'SUCCESS' : 'ERROR';
        const expectedState = i <= 4 ? 'CLOSED' : 'OPEN';

        expect(result).toBe(expectedResult);
        expect(testCircuitBreaker.state).toBe(expectedState);
    }
});

test('should return SUCCESS', async () => {
    const testCircuitBreaker = new CircuitBreaker(testFn, {
        percentThreshold: 30,
        timeout: 500,
        timeToRecover: 60000,
        maxHalfOpenAttempts: 1
    });

    const result = await testCircuitBreaker.execute('ERROR');
    expect(result).toBe('SUCCESS');
});

test('should return ERROR when function times out', async () => {
    const testCircuitBreaker = new CircuitBreaker(timeoutTestFn, {
        percentThreshold: 30,
        timeout: 100,
        timeToRecover: 60000,
        maxHalfOpenAttempts: 1
    });

    const result = await testCircuitBreaker.execute('ERROR');
    expect(result).toBe('ERROR');
});

test('should return state to CLOSED', async () => {
    const testCircuitBreaker = new CircuitBreaker(testFn, {
        percentThreshold: 30,
        timeout: 300,
        timeToRecover: 150,
        maxHalfOpenAttempts: 1
    });

    const result = await testCircuitBreaker.execute('ERROR', 4);
    expect(result).toBe('ERROR');
    expect(testCircuitBreaker.state).toBe('OPEN');

    // await 200ms to recover
    await timeoutTestFn();

    const secondResult = await testCircuitBreaker.execute('ERROR', 1);
    expect(secondResult).toBe('SUCCESS');
    expect(testCircuitBreaker.state).toBe('CLOSED');
});

test('should keep half closed when functions keeps with error', async () => {
    const testCircuitBreaker = new CircuitBreaker(testFn, {
        percentThreshold: 30,
        timeout: 300,
        timeToRecover: 150,
        maxHalfOpenAttempts: 1
    });

    const result = await testCircuitBreaker.execute('ERROR', 4);
    expect(result).toBe('ERROR');
    expect(testCircuitBreaker.state).toBe('OPEN');

    // await 200ms to recover
    await timeoutTestFn();

    const secondResult = await testCircuitBreaker.execute('ERROR', 4);
    expect(secondResult).toBe('ERROR');
    expect(testCircuitBreaker.state).toBe('HALF-OPEN');
});

test('should back state to OPEN if maxHalfOpenAttempts exceeded', async () => {
    const testCircuitBreaker = new CircuitBreaker(testFn, {
        percentThreshold: 30,
        timeout: 300,
        timeToRecover: 150,
        maxHalfOpenAttempts: 1
    });

    const result = await testCircuitBreaker.execute('ERROR', 4);
    expect(result).toBe('ERROR');
    expect(testCircuitBreaker.state).toBe('OPEN');

    // await 200ms to recover
    await timeoutTestFn();

    const secondResult = await testCircuitBreaker.execute('ERROR', 4);
    expect(secondResult).toBe('ERROR');
    expect(testCircuitBreaker.state).toBe('HALF-OPEN');

    const thirdResult = await testCircuitBreaker.execute('ERROR', 4);
    expect(thirdResult).toBe('ERROR');
    expect(testCircuitBreaker.state).toBe('OPEN');
});
