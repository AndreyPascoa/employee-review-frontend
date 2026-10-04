export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(
  path: string,
  options: { leaderId?: string; signal?: AbortSignal; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.leaderId) headers["X-Leader-ID"] = options.leaderId;
  if (options.body) headers["Content-Type"] = "application/json";
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: options.body ? "POST" : "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      0,
      "Não foi possível conectar. Confira sua conexão e tente novamente.",
    );
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data ? data.detail : null;
    throw new ApiError(
      response.status,
      typeof detail === "string"
        ? detail
        : "Não foi possível concluir a solicitação. Confira os dados e tente novamente.",
    );
  }
  if (data === null)
    throw new ApiError(
      502,
      "O serviço retornou uma resposta inválida. Tente novamente.",
    );
  return data as T;
}
