/**
 * Simple Logger with transaction_id and action tracking
 */
export interface LogContext {
    transaction_id?: string;
    message_id?: string;
    action?: string;
    service?: string;
    [key: string]: any;
}
export declare function createLogger(service: string): {
    info(message: string, context?: Omit<LogContext, "service">): void;
    warn(message: string, context?: Omit<LogContext, "service">): void;
    error(message: string, context?: Omit<LogContext, "service">): void;
    debug(message: string, context?: Omit<LogContext, "service">): void;
};
