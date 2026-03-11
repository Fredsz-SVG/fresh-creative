"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logApiTiming = logApiTiming;
function logApiTiming(method, path, start) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_API_TIMING === '1') {
        const ms = (performance.now() - start).toFixed(0);
        console.log(`[API] ${method} ${path} ${ms}ms`);
    }
}
