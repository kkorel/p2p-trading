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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToObject(columns, values) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = {};
    columns.forEach((col, i) => {
        obj[col] = values[i];
    });
    return obj;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7O0FBT0gsa0NBT0M7QUFaRDs7O0dBR0c7QUFDSCw4REFBOEQ7QUFDOUQsU0FBZ0IsV0FBVyxDQUFDLE9BQWlCLEVBQUUsTUFBYTtJQUMxRCw4REFBOEQ7SUFDOUQsTUFBTSxHQUFHLEdBQVEsRUFBRSxDQUFDO0lBQ3BCLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDekIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogRGF0YWJhc2UgVXRpbGl0eSBGdW5jdGlvbnNcbiAqL1xuXG4vKipcbiAqIENvbnZlcnQgYSBzcWwuanMgcmVzdWx0IHJvdyAoY29sdW1ucyArIHZhbHVlcyBhcnJheSkgdG8gYW4gb2JqZWN0XG4gKiBOb3RlOiBSZXR1cm5zIGFueSBmb3IgcHJhY3RpY2FsIHVzZSB3aXRoIGR5bmFtaWMgU1FMIHJlc3VsdHNcbiAqL1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbmV4cG9ydCBmdW5jdGlvbiByb3dUb09iamVjdChjb2x1bW5zOiBzdHJpbmdbXSwgdmFsdWVzOiBhbnlbXSk6IGFueSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIGNvbnN0IG9iajogYW55ID0ge307XG4gIGNvbHVtbnMuZm9yRWFjaCgoY29sLCBpKSA9PiB7XG4gICAgb2JqW2NvbF0gPSB2YWx1ZXNbaV07XG4gIH0pO1xuICByZXR1cm4gb2JqO1xufVxuIl19