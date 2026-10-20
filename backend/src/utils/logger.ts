import { env } from '../config/env';

type LogValue = Record<string, unknown> | string;
type LogMethod = (value: LogValue, message?: string) => void;

const LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
type Level = (typeof LEVELS)[number];

function serialize(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function levelEnabled(level: Level): boolean {
  const configured = LEVELS.indexOf(env.LOG_LEVEL);
  return LEVELS.indexOf(level) >= configured;
}

class Logger {
  constructor(private readonly context: Record<string, unknown> = {}) {}

  private emit(level: Level, value: LogValue, message?: string): void {
    if (!levelEnabled(level)) return;
    const payload =
      typeof value === 'string'
        ? { ...this.context, msg: value }
        : { ...this.context, ...value, ...(message !== undefined ? { msg: message } : {}) };
    const line = JSON.stringify(
      { level, time: new Date().toISOString(), ...payload },
      serialize,
    );
    if (level === 'error' || level === 'fatal') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  trace(value: LogValue, message?: string): void {
    this.emit('trace', value, message);
  }
  debug(value: LogValue, message?: string): void {
    this.emit('debug', value, message);
  }
  info(value: LogValue, message?: string): void {
    this.emit('info', value, message);
  }
  warn(value: LogValue, message?: string): void {
    this.emit('warn', value, message);
  }
  error(value: LogValue, message?: string): void {
    this.emit('error', value, message);
  }
  fatal(value: LogValue, message?: string): void {
    this.emit('fatal', value, message);
  }

  child(context: Record<string, unknown>): Logger {
    return new Logger({ ...this.context, ...context });
  }
}

export const logger = new Logger();

export function createChildLogger(context: Record<string, unknown>): Logger {
  return logger.child(context);
}

export type { LogMethod };
