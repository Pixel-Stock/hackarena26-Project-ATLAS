/* ============================================================
   ATLAS — Logger Utility
   Structured logging that respects NODE_ENV.
   No console.log in production.
   ============================================================ */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = process.env.NODE_ENV === 'development';

function formatMessage(level: LogLevel, module: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}`;
}

export const logger = {
    debug(module: string, message: string, data?: unknown): void {
        if (!isDev) return;
        console.debug(formatMessage('debug', module, message), data ?? '');
    },

    info(module: string, message: string, data?: unknown): void {
        if (!isDev) return;
        console.info(formatMessage('info', module, message), data ?? '');
    },

    warn(module: string, message: string, data?: unknown): void {
        console.warn(formatMessage('warn', module, message), data ?? '');
    },

    error(module: string, message: string, error?: unknown): void {
        console.error(
            formatMessage('error', module, message),
            error instanceof Error ? { message: error.message, stack: error.stack } : error ?? ''
        );
    },
};
