// Central error codes and helpers
export enum ErrorCode {
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  LLM_EMPTY = 'LLM_EMPTY',
  LLM_FAILURE = 'LLM_FAILURE',
  RENDER_JAVA_MISSING = 'RENDER_JAVA_MISSING',
  RENDER_DOT_BLOCKED = 'RENDER_DOT_BLOCKED',
  RENDER_SYNTAX = 'RENDER_SYNTAX',
  RENDER_FAILURE = 'RENDER_FAILURE',
  CFG_INVALID_DOT_PATH = 'CFG_INVALID_DOT_PATH',
  IO_SAVE_FAIL = 'IO_SAVE_FAIL',
  STATE_ONBOARDING_LOAD = 'STATE_ONBOARDING_LOAD',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError extends Error {
  code: ErrorCode;
  details?: any;
  userMessage?: string;
}

export function createError(code: ErrorCode, message: string, details?: any, userMessage?: string): AppError {
  const err = new Error(message) as AppError;
  err.code = code;
  err.details = details;
  err.userMessage = userMessage;
  return err;
}

export function ensureAppError(e: unknown, fallback: ErrorCode = ErrorCode.UNKNOWN): AppError {
  if (e && typeof e === 'object' && (e as any).code && (e as any).message) {
    return e as AppError;
  }
  if (e instanceof Error) {
    const err = e as AppError; // augment
    if (!(err as any).code) {
      err.code = fallback;
    }
    return err;
  }
  return createError(fallback, String(e));
}
