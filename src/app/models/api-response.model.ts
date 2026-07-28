export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data?: T;
}

export interface BilingualMessage {
  en: string;
  ar: string;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  code?: string;
  message?: string | BilingualMessage;
  messageKey?: string;
  correlationId?: string;
  requestId?: string;
  traceId?: string;
  extensions?: Record<string, unknown>;
}
