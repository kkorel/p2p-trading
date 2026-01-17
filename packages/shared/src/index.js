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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsbUNBQW1DOzs7Ozs7Ozs7Ozs7Ozs7O0FBRW5DLG1CQUFtQjtBQUNuQiwwQ0FBd0I7QUFFeEIsdUJBQXVCO0FBQ3ZCLDBDQUF3QjtBQUV4Qix5QkFBeUI7QUFDekIsdUNBQXFCO0FBRXJCLDRCQUE0QjtBQUM1Qiw2Q0FBMkI7QUFFM0IsZ0JBQWdCO0FBQ2hCLDJDQUF5QiIsInNvdXJjZXNDb250ZW50IjpbIi8vIE1haW4gZW50cnkgcG9pbnQgZm9yIEBwMnAvc2hhcmVkXG5cbi8vIEV4cG9ydCBhbGwgdHlwZXNcbmV4cG9ydCAqIGZyb20gJy4vdHlwZXMnO1xuXG4vLyBFeHBvcnQgYWxsIHV0aWxpdGllc1xuZXhwb3J0ICogZnJvbSAnLi91dGlscyc7XG5cbi8vIEV4cG9ydCBkYXRhYmFzZSBzY2hlbWFcbmV4cG9ydCAqIGZyb20gJy4vZGInO1xuXG4vLyBFeHBvcnQgbWF0Y2hpbmcgYWxnb3JpdGhtXG5leHBvcnQgKiBmcm9tICcuL21hdGNoaW5nJztcblxuLy8gRXhwb3J0IGNvbmZpZ1xuZXhwb3J0ICogZnJvbSAnLi9jb25maWcnO1xuIl19