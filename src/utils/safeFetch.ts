/**
 * Safe JSON fetch utility for API communication.
 * Prevents "Unexpected token '<', '<!doctype '... is not valid JSON" errors
 * by verifying content-type, handling server warmup / proxy 502s,
 * and performing graceful retries when necessary.
 */

export interface SafeFetchResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 1
): Promise<SafeFetchResponse<T>> {
  let attempt = 0;
  while (attempt <= retries) {
    attempt++;
    try {
      const res = await fetch(input, {
        ...init,
        headers: {
          Accept: 'application/json',
          ...(init?.headers || {})
        }
      });

      const contentType = res.headers.get('content-type') || '';

      // Check if response returned HTML instead of expected JSON
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        const isHtml = text.trim().startsWith('<') || text.includes('<!doctype') || text.includes('<html');

        // If it's a 502/503/504 or warmup page, retry once if retries remain
        if ((res.status >= 500 || isHtml) && attempt <= retries) {
          await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
          continue;
        }

        let userError = 'Server temporarily unavailable. Please try again.';
        if (res.status === 404) {
          userError = 'The requested resource or endpoint was not found.';
        } else if (res.status === 429) {
          userError = 'Too many requests. Please wait a moment and try again.';
        } else if (res.status >= 500) {
          userError = 'Server is currently busy or warming up. Please try again.';
        } else if (isHtml) {
          userError = 'Received unexpected server response. Please try again.';
        }

        return {
          ok: false,
          status: res.status,
          error: userError
        };
      }

      // Safe JSON parsing
      try {
        const data = (await res.json()) as T;
        return {
          ok: res.ok,
          status: res.status,
          data,
          error: (data as any)?.error || (!res.ok ? `Request failed (${res.status})` : undefined)
        };
      } catch (parseErr: any) {
        if (attempt <= retries) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        return {
          ok: false,
          status: res.status,
          error: 'Failed to parse response data. Please try again.'
        };
      }
    } catch (networkErr: any) {
      if (attempt <= retries) {
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
        continue;
      }
      return {
        ok: false,
        status: 0,
        error: networkErr?.message || 'Network connection failed'
      };
    }
  }

  return {
    ok: false,
    status: 500,
    error: 'Request timed out or server unavailable. Please try again.'
  };
}
