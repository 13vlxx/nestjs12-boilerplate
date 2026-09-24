type LogtoResponse<T> = { data?: T; error?: unknown; response: Response };

export class LogtoRequestError extends Error {
  constructor(
    readonly status: number,
    url: string,
    error: unknown,
  ) {
    super(`Logto ${status} on ${url}: ${JSON.stringify(error)}`);
  }
}

export async function unwrap<T>(
  request: Promise<LogtoResponse<T>>,
): Promise<T> {
  const { data, error, response } = await request;
  if (!response.ok || data === undefined)
    throw new LogtoRequestError(response.status, response.url, error);
  return data;
}

export async function unwrapOrNull<T>(
  request: Promise<LogtoResponse<T>>,
): Promise<T | null> {
  try {
    return await unwrap(request);
  } catch (error) {
    if (error instanceof LogtoRequestError && error.status === 404) return null;
    throw error;
  }
}
