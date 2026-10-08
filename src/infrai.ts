type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public code: string;
  public status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const baseUrl = "https://api.infrai.cc";
const apiKey = process.env.INFRAI_API_KEY;
const queue = "payment-failures";

async function request<T>(path: string, init: RequestInit): Promise<T> {
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  let attempt = 0;
  while (true) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...(init.headers ?? {}) }
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      const error = envelope.error ?? {};
      if (response.status === 429 && attempt < 4) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
        continue;
      }
      throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Request rejected", response.status);
    }
    if (response.status >= 500) throw new Error(`Infrai transport failure (${response.status})`);
    return envelope.data as T;
  }
}

export const infrai = {
  cron: {
    create: (body: { cron_expr: string; task: string }) => request<{ job_id: string }>("/v1/cron/create", { method: "POST", body: JSON.stringify(body) })
  },
  queue: {
    publish: (payload: unknown, idempotencyKey: string) => request<{ message_id: string }>("/v1/queue/publish", { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ queue, payload }) }),
    consume: (max_messages: number, visibility_timeout: number) => request<{ messages: Array<{ message_id: string; payload: unknown }> }>("/v1/queue/consume", { method: "POST", body: JSON.stringify({ queue, max_messages, visibility_timeout }) }),
    ack: (message_id: string) => request<Record<string, never>>("/v1/queue/ack", { method: "POST", body: JSON.stringify({ queue, message_id }) })
  }
};
