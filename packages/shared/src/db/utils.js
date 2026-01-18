"use strict";
/**
 * Database Utility Functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToObject = rowToObject;

/**
 * Convert a sql.js result row (columns + values array) to an object
 * Note: Returns any for practical use with dynamic SQL results
 */
function rowToObject(columns, values) {
    const obj = {};
    columns.forEach((col, i) => {
        obj[col] = values[i];
    });
    return obj;
}
