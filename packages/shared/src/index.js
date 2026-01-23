"use strict";
// Main entry point for @p2p/shared
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Export all types
__exportStar(require("./types"), exports);
// Export all utilities
__exportStar(require("./utils"), exports);
// Export database schema
__exportStar(require("./db"), exports);
// Export matching algorithm
__exportStar(require("./matching"), exports);
// Export config
__exportStar(require("./config"), exports);
// Export seed data
__exportStar(require("./seed"), exports);
// Export authentication
__exportStar(require("./auth"), exports);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsbUNBQW1DOzs7Ozs7Ozs7Ozs7Ozs7O0FBRW5DLG1CQUFtQjtBQUNuQiwwQ0FBd0I7QUFFeEIsdUJBQXVCO0FBQ3ZCLDBDQUF3QjtBQUV4Qix5QkFBeUI7QUFDekIsdUNBQXFCO0FBRXJCLDRCQUE0QjtBQUM1Qiw2Q0FBMkI7QUFFM0IsZ0JBQWdCO0FBQ2hCLDJDQUF5QjtBQUV6QixtQkFBbUI7QUFDbkIseUNBQXVCO0FBRXZCLHdCQUF3QjtBQUN4Qix5Q0FBdUIiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBNYWluIGVudHJ5IHBvaW50IGZvciBAcDJwL3NoYXJlZFxuXG4vLyBFeHBvcnQgYWxsIHR5cGVzXG5leHBvcnQgKiBmcm9tICcuL3R5cGVzJztcblxuLy8gRXhwb3J0IGFsbCB1dGlsaXRpZXNcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMnO1xuXG4vLyBFeHBvcnQgZGF0YWJhc2Ugc2NoZW1hXG5leHBvcnQgKiBmcm9tICcuL2RiJztcblxuLy8gRXhwb3J0IG1hdGNoaW5nIGFsZ29yaXRobVxuZXhwb3J0ICogZnJvbSAnLi9tYXRjaGluZyc7XG5cbi8vIEV4cG9ydCBjb25maWdcbmV4cG9ydCAqIGZyb20gJy4vY29uZmlnJztcblxuLy8gRXhwb3J0IHNlZWQgZGF0YVxuZXhwb3J0ICogZnJvbSAnLi9zZWVkJztcblxuLy8gRXhwb3J0IGF1dGhlbnRpY2F0aW9uXG5leHBvcnQgKiBmcm9tICcuL2F1dGgnO1xuIl19