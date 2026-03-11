export function logApiTiming(method: string, path: string, start: number): void {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_API_TIMING === '1') {
        const ms = (performance.now() - start).toFixed(0)
        console.log(`[API] ${method} ${path} ${ms}ms`)
    }
}
