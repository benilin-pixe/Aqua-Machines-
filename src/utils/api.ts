export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
  error?: string;
  // Fallback direct access properties for backwards compatibility
  [key: string]: any;
}

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Safely formats any unknown error (Error instance, string, API error object, nested object)
 * into a clean human-readable string, preventing any "[object Object]" rendering.
 */
export function formatError(error: unknown, fallback: string = 'An unexpected error occurred.'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'object') {
    const errObj = error as Record<string, any>;
    const msg = errObj.message || errObj.error || errObj.error_description || errObj.details || errObj.code;
    if (typeof msg === 'string' && msg.trim().length > 0) {
      return msg;
    }
    if (msg && typeof msg === 'object') {
      const nestedMsg = msg.message || msg.error;
      if (typeof nestedMsg === 'string' && nestedMsg.trim().length > 0) {
        return nestedMsg;
      }
    }
    try {
      const jsonStr = JSON.stringify(error);
      if (jsonStr && jsonStr !== '{}') return jsonStr;
    } catch {}
  }
  return fallback;
}

/**
 * Safely parses any response (JSON, text, HTML error pages, empty responses)
 * without ever throwing syntax errors like "Unexpected token < or A".
 */
export async function safeFetch<T = any>(
  input: RequestInfo | URL,
  init?: SafeFetchOptions
): Promise<{ ok: boolean; status: number; data: ApiResponse<T> }> {
  const timeoutMs = init?.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fetchOptions: RequestInit = {
      ...init,
      signal: init?.signal || controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
        ...(init?.headers || {}),
      },
    };

    const res = await fetch(input, fetchOptions);
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    const rawText = await res.text();

    let parsedBody: any = null;
    if (rawText && rawText.trim().length > 0) {
      try {
        parsedBody = JSON.parse(rawText);
      } catch {
        // Response is not valid JSON (e.g., HTML error page, plain text error, proxy response)
        parsedBody = null;
      }
    }

    if (parsedBody && typeof parsedBody === 'object') {
      const isSuccess =
        typeof parsedBody.success === 'boolean'
          ? parsedBody.success
          : res.ok;

      const message =
        parsedBody.message ||
        (parsedBody.error ? formatError(parsedBody.error) : undefined);

      const normalized: ApiResponse<T> = {
        ...parsedBody,
        success: isSuccess,
        message,
        data: parsedBody.data !== undefined ? parsedBody.data : parsedBody,
        error: isSuccess ? undefined : (message || `Request failed with HTTP ${res.status}`),
        code: parsedBody.code || (res.ok ? 'SUCCESS' : `HTTP_${res.status}`),
      };

      return {
        ok: res.ok && isSuccess,
        status: res.status,
        data: normalized,
      };
    }

    // Handled non-JSON or HTML/plain text response safely
    let errorMessage: string;
    if (!res.ok) {
      if (rawText.includes('<html') || rawText.includes('<!DOCTYPE') || rawText.includes('Starting Server')) {
        errorMessage = `Server temporary status: HTTP ${res.status} (${res.statusText || 'Service warming up'})`;
      } else if (rawText.trim().length > 0 && rawText.length < 200) {
        errorMessage = rawText.trim();
      } else {
        errorMessage = `Server returned HTTP ${res.status} ${res.statusText || 'Error'}`;
      }
    } else {
      errorMessage = 'OK';
    }

    return {
      ok: res.ok,
      status: res.status,
      data: {
        success: res.ok,
        message: errorMessage,
        error: res.ok ? undefined : errorMessage,
        code: res.ok ? 'SUCCESS' : `HTTP_${res.status}`,
        data: undefined,
      },
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errObj = err as any;
    const isTimeout = errObj?.name === 'AbortError';
    const message = isTimeout
      ? `Request timed out after ${timeoutMs / 1000}s. Please check your network connection.`
      : formatError(err, 'Network error connecting to platform server.');

    return {
      ok: false,
      status: isTimeout ? 408 : 0,
      data: {
        success: false,
        message,
        error: message,
        code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
        data: undefined,
      },
    };
  }
}
