import { infrai } from "./infrai.js";
import { decideAfterFailure, parsePayment } from "./dead_letter_service.js";

const workerUrl = process.env.WORKER_URL ?? "https://example.com/payments/consume";

export async function publishPayment(body: unknown): Promise<string> {
  const event = parsePayment(body);
  const result = await infrai.queue.publish(event, `payment-${event.paymentId}-${event.attempt}`);
  return result.message_id;
}

export async function runDeadLetterPass(): Promise<Array<{ paymentId: string; action: string; reason: string }>> {
  const batch = await infrai.queue.consume(10, 60);
  const notices = [] as Array<{ paymentId: string; action: string; reason: string }>;
  for (const message of batch.messages) {
    const notice = decideAfterFailure(parsePayment(message.payload));
    notices.push(notice);
    await infrai.queue.ack(message.message_id);
  }
  return notices;
}

export async function scheduleWorker(): Promise<string> {
  const result = await infrai.cron.create({ cron_expr: "*/5 * * * *", task: workerUrl });
  return result.job_id;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const payment = { paymentId: "pay_demo_001", amountCents: 1250, currency: "USD", recipient: "creator@example.com", attempt: 3 };
  console.log("queued message:", await publishPayment(payment));
  console.log("scheduled worker:", await scheduleWorker());
}
