/**
 * Database Utility Functions
 */
/**
 * Convert a sql.js result row (columns + values array) to an object
 * Note: Returns any for practical use with dynamic SQL results
 */
export declare function rowToObject(columns: string[], values: any[]): any;
