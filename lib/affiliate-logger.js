import "server-only";
const logs = [];
const MAX_LOGS = 1000;
function getTimestamp() {
    return new Date().toISOString();
}
export function logAffiliateConversion(level, message, data) {
    const entry = {
        timestamp: getTimestamp(),
        level,
        message,
        data,
    };
    logs.push(entry);
    // Manter apenas os últimos MAX_LOGS
    if (logs.length > MAX_LOGS) {
        logs.shift();
    }
    // Log no console em desenvolvimento
    if (process.env.NODE_ENV === "development") {
        const logFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
        logFn(`[Affiliate ${level.toUpperCase()}]`, message, data || "");
    }
}
export function getAffiliateConversionLogs(count = 50) {
    return logs.slice(-count);
}
export function getLogs() {
    return [...logs];
}
export function clearLogs() {
    logs.length = 0;
}
