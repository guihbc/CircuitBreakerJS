import CircuitBreaker from "./CircuitBreaker";
import CircuitBreakerConfig from "./CircuitBreakerConfig";
import CircuitBreakerState from "./CircuitBreakerState";
import { RedisClientType } from 'redis';
import { STATE, NEXT_ATTEMPT, HALF_OPEN_ATTEMPTS, ERROR_COUNT } from "./RedisCircuitBreakerKey";
import CircuitBreakerTimeoutError from "./CircuitBreakerTimeoutError";

/**
 * CircuitBreaker for distributed systems implemented using Redis client
 */
export default class RedisCircuitBreaker extends CircuitBreaker {
    id: String;
    private callFn: Function;
    private redisKeyPrefix: String;
    private redisClient: RedisClientType; // THIS RedisClientType is not working
    protected config: CircuitBreakerConfig;

    /**
     * 
     * @param {String} id 
     * @param {Function} callFn 
     * @param {CircuitBreakerConfig} config 
     * @param {RedisClientType} redisClient 
     */
    constructor(callFn: Function, config: CircuitBreakerConfig, redisClient: RedisClientType, id: String = '') {
        super();
        this.id = id;
        this.callFn = callFn;
        this.config = config;
        this.redisClient = redisClient;
        this.redisKeyPrefix = `${this.id}_${this.callFn.name}_`;
    }

    async execute(fallback: any, ...args: any): Promise<any> {
        const { OPEN, CLOSED, HALF_OPEN } = CircuitBreakerState;
        
        let state = await this.getKey(STATE);
        let halfOpenAttempts = await this.getKey(HALF_OPEN_ATTEMPTS);
        const nextAttempt = await this.getKey(NEXT_ATTEMPT);

        if (state === OPEN) {
            if (Date.now() >= nextAttempt) {
                await this.setKey(STATE, HALF_OPEN);
                await this.setKey(HALF_OPEN_ATTEMPTS, "0");
            } else {
                console.info('Circuit OPEN returning fallback');
                return fallback;
            }
        }

        if (state === HALF_OPEN && halfOpenAttempts > this.config.maxHalfOpenAttempts) {
            this.trip();
            return fallback;
        } else {
            await this.incrKey(HALF_OPEN_ATTEMPTS);
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
            const errorCount = await this.incrKey(ERROR_COUNT);
            state = await this.getKey(STATE);
            halfOpenAttempts = await this.getKey(HALF_OPEN_ATTEMPTS);
            
            console.error(error.message);
            console.info(`Circuit Breaker error count: ${errorCount}`);

            if (errorCount > this.config.threshold &&
                (state == CLOSED || (state == HALF_OPEN && halfOpenAttempts > this.config.maxHalfOpenAttempts))) {
                this.trip();
            }

            return fallback;
        }
    }

    protected async reset() {
        await this.setKey(ERROR_COUNT, "0")
        
        if (this.state === CircuitBreakerState.HALF_OPEN) {
            await this.setKey(HALF_OPEN_ATTEMPTS, "0");
        }

        await this.setKey(STATE, CircuitBreakerState.CLOSED);
        console.info('Circuit Breaker State: CLOSED');
    }

    protected async trip() {
        await this.setKey(STATE, CircuitBreakerState.OPEN);
        await this.setKey(NEXT_ATTEMPT, Date.now() + this.config.timeToRecover);
        console.warn('Circuit Breaker State: OPEN');
    }
    
    async loadFromRedis(): Promise<RedisCircuitBreaker> {
        if (await this.getKey(STATE) == null) {
            await this.setKey(STATE, CircuitBreakerState.CLOSED);
        }

        if (await this.getKey(NEXT_ATTEMPT) == null) {
            await this.setKey(NEXT_ATTEMPT, Date.now());
        }

        return this;
    }

    private async incrKey(key: String): Promise<any> {
        return await this.redisClient.incr(`${this.redisKeyPrefix}${key}`);
    }

    private async setKey(key: String, value: any): Promise<void> {
        await this.redisClient.set(`${this.redisKeyPrefix}${key}`, value);
    }

    private async getKey(key: String): Promise<any> {
        return await this.redisClient.get(`${this.redisKeyPrefix}${key}`);
    }
}
