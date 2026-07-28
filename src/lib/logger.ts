/**
 * 结构化日志。
 *
 * 为什么需要它：原先全项目是 `console.error('[scope] msg', err)` 这类自由文本。
 * 在 Vercel 日志里只能全文搜索，无法按字段过滤、聚合或建告警 ——
 * 也就是「故障发生了但没人知道」。
 *
 * 生产环境输出单行 JSON，Vercel 日志查询与 Log Drains 可直接按
 * level / scope / event 建告警规则；开发环境输出人类可读格式。
 *
 * 约定：
 * - event 用稳定的短标识（如 'db_error'、'budget_exceeded'），便于告警规则匹配；
 *   可变信息放 fields，不要拼进 event，否则告警无法聚合。
 * - **不要记录密钥、token、完整邮箱、请求体原文**。日志会流向第三方 drain。
 */

export type LogLevel = 'info' | 'warn' | 'error';

export type LogFields = Record<string, unknown>;

interface SerializedError {
  name: string;
  message: string;
  stack?: string;
}

function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: 'NonError', message: String(error) };
}

function emit(level: LogLevel, scope: string, event: string, fields?: LogFields): void {
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  // NODE_ENV 在每次调用时读取，便于测试切换环境
  if (process.env.NODE_ENV === 'production') {
    sink(JSON.stringify({ level, scope, event, time: new Date().toISOString(), ...fields }));
    return;
  }
  sink(`[${scope}] ${event}`, fields ? fields : '');
}

export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  /** error 的第二个参数是异常对象，会被序列化到 fields.error 下。 */
  error(event: string, error?: unknown, fields?: LogFields): void;
}

/**
 * 创建带固定 scope 的 logger。
 * @param scope 模块标识，沿用原来的写法，如 'api/chat'、'cron:github'。
 */
export function createLogger(scope: string): Logger {
  return {
    info: (event, fields) => emit('info', scope, event, fields),
    warn: (event, fields) => emit('warn', scope, event, fields),
    error: (event, error, fields) =>
      emit('error', scope, event, {
        ...fields,
        ...(error === undefined ? {} : { error: serializeError(error) }),
      }),
  };
}
