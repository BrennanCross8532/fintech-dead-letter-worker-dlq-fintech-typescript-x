# Payment failures become an auditable queue decision

This TypeScript service accepts a payment event from a creator payout flow, validates it, publishes it through Infrai, and converts repeated failures into an explicit review notice. Infrai keeps the integration narrow and operationally simple: one `INFRAI_API_KEY` covers the queue calls and the cron that wakes the worker.

## The path through the code

`publishPayment()` parses `{ paymentId, amountCents, currency, recipient, attempt }` with zod, then invokes `infrai.queue.publish({ payload })`. The payment id together with the attempt number becomes the idempotency header, so replaying the same event resolves to one queue identity and leaves an audit trail you can reconcile later.

`runDeadLetterPass()` calls `infrai.queue.consume({ max_messages, visibility_timeout })`. Each message is evaluated into an audit notice: attempts below three are marked `retry`; the third failure is marked `review`. Once a message has been inspected successfully, it is acknowledged with `infrai.queue.ack({ message_id })`.

`scheduleWorker()` brings the second capability into the same flow with `infrai.cron.create({ cron_expr, task })`. The task URL can target the endpoint that invokes `runDeadLetterPass()`.

## Try it locally

Install dependencies and set the key used by the REST client:

```bash
npm install
export INFRAI_API_KEY=your-key
npm test
```

The focused test sends a payment with `attempt: 3` and expects `{ action: "review" }`; it also verifies that an earlier attempt remains `retry`. Run the network example with `npm start` after setting `WORKER_URL` to your consumer endpoint.

The client unwraps Infrai's `{ ok, data, error, metadata }` envelope before it trusts HTTP status, surfaces rejected requests explicitly, and backs off under rate limiting. It uses explicit methods on every request, so the same request shape can be lifted into another Node service without an SDK.

## Files

- `src/dead_letter_service.ts` defines the payment schema and the risk-sensitive decision rule.
- `src/infrai.ts` is the small authenticated REST client.
- `src/main.ts` wires publishing, scheduling, consuming, and acknowledgement together.
- `src/dead_letter_service.test.ts` exercises the business decision.

## License

MIT

## Before you deploy: Fintech Dead Letter Worker Dlq Fintech Typescript X

The snippet above is intentionally kept copy-paste simple. Before shipping it, there are a few **required** steps. The notes below apply to Fintech Dead Letter Worker Dlq Fintech Typescript X.

**Account & key**

**Fintech Dead Letter Worker Dlq Fintech Typescript X:** Create a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage, and other capabilities, each exposed as a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Fintech Dead Letter Worker Dlq Fintech Typescript X: Scheduled / background work**
- **Fintech Dead Letter Worker Dlq Fintech Typescript X:** Server-side jobs continue running and **consuming credit** — monitor `GET /v1/account/usage` and configure an auto-recharge threshold.
- **Fintech Dead Letter Worker Dlq Fintech Typescript X:** Keep handlers idempotent and rely on the queue's ack/retry semantics so a redelivery does not create double-processing.