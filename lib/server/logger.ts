type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  traceId?: string;
  userId?: string;
}

const REDACT_KEYS = ["password", "passwordHash", "token", "authorization", "cookie", "secret", "key", "fin", "ticketCode", "accessToken"];

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (REDACT_KEYS.some(k => lowerKey.includes(k.toLowerCase()))) {
      result[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = redact(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map(v => v && typeof v === "object" ? redact(v as Record<string, unknown>) : v);
    } else {
      result[key] = value;
    }
  }
  return result;
}

let logBuffer: LogEntry[] = [];
const MAX_BUFFER = 1000;

function flushBuffer() {
  if (logBuffer.length > MAX_BUFFER) {
    logBuffer = logBuffer.slice(-MAX_BUFFER);
  }
}

export function createLogger(context: Record<string, unknown> = {}) {
  const baseContext = redact(context);

  function log(level: LogLevel, message: string, extra?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: extra ? { ...baseContext, ...redact(extra) } : baseContext,
    };
    logBuffer.push(entry);
    flushBuffer();

    const output = JSON.stringify(entry);
    if (level === "error") console.error(output);
    else if (level === "warn") console.warn(output);
    else console.log(output);
  }

  return {
    debug: (message: string, extra?: Record<string, unknown>) => log("debug", message, extra),
    info: (message: string, extra?: Record<string, unknown>) => log("info", message, extra),
    warn: (message: string, extra?: Record<string, unknown>) => log("warn", message, extra),
    error: (message: string, extra?: Record<string, unknown>) => log("error", message, extra),
    getBuffer: () => [...logBuffer],
  };
}

export const logger = createLogger({ service: "hilalkurslari" });

export function getRequestTraceId(req: Request): string {
  void req; return crypto.randomUUID();
}

export function withTraceId(req: Request, handler: (traceId: string) => Promise<Response>): Promise<Response> {
  const traceId = getRequestTraceId(req);
  return handler(traceId).then(res => {
    res.headers.set("x-request-id", traceId);
    return res;
  });
}

export async function logApiRequest(
  req: Request,
  handler: (traceId: string) => Promise<Response>
): Promise<Response> {
  const traceId = getRequestTraceId(req);
  const start = Date.now();
  const method = req.method;
  const url = new URL(req.url).pathname;

  logger.info("API request started", { traceId, method, url });

  try {
    const response = await handler(traceId);
    const duration = Date.now() - start;
    logger.info("API request completed", { traceId, method, url, status: response.status, durationMs: duration });
    response.headers.set("x-request-id", traceId);
    response.headers.set("x-response-time", String(duration));
    return response;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error("API request failed", { traceId, method, url, errorType: error instanceof Error ? error.name : "UnknownError", durationMs: duration });
    throw error;
  }
}
export function logFailure(event:string,error:unknown){logger.error(event,{errorType:error instanceof Error?error.name:'UnknownError',code:error&&typeof error==='object'&&'code' in error&&typeof error.code==='string'&&/^[A-Z0-9_]{1,30}$/.test(error.code)?error.code:undefined});}
