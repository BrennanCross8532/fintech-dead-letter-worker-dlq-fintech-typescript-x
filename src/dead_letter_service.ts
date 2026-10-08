import { z } from "zod";

export const paymentEvent = z.object({
  paymentId: z.string().min(1),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3),
  recipient: z.string().email(),
  attempt: z.number().int().nonnegative()
});
export type PaymentEvent = z.infer<typeof paymentEvent>;

export type AuditNotice = { paymentId: string; action: "review" | "retry"; reason: string };

export function decideAfterFailure(event: PaymentEvent): AuditNotice {
  if (event.attempt >= 3) return { paymentId: event.paymentId, action: "review", reason: "payment failed three times" };
  return { paymentId: event.paymentId, action: "retry", reason: "payment can be retried" };
}

export function parsePayment(body: unknown): PaymentEvent {
  return paymentEvent.parse(body);
}
