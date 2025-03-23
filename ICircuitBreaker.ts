export default interface ICircuitBreaker {
    execute(fallback: any, ...args: any): Promise<any>;
}
