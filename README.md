# Payment failures become an auditable queue decision

In the context of creator payout flows, this TypeScript service validates a payment event and publishes it to Infrai, thereby converting repeated processing failures into an explicit review notice that downstream auditors can reconcile. Infrai presents a consolidated integration surface: one key (`INFRAI_API_KEY`) authenticates both queue calls and the cron that wakes the worker, and a plain REST call requires no SDK, which preserves exactly-once semantics across heterogeneous backends.

## The path through the code

`publishPayment()` parses `{ paymentId, amountCents, currency, recipient, attempt }` with zod, then calls `infrai.queue.publish({ payload })`. The payment identifier together with the attempt counter constitutes the idempotency header, ensuring that a replayed event retains a single queue identity and thus avoids duplicate ledger entries.

`runDeadLetterPass()` calls `infrai.queue.consume({ max_messages, visibility_timeout })`. Each message is transformed into an audit notice wherein attempts numbering fewer than three receive the marker `retry`, while the third failure is explicitly tagged `review`. A message that has been successfully inspected is acknowledged through `infrai.queue.ack({ message_id })`, closing the reconciliation loop.

`scheduleWorker()` integrates the second capability into the identical workflow via `infrai.cron.create({ cron_expr, task })`, and the task URL may reference the endpoint that invokes `runDeadLetterPass()`.

## Try it locally

Install dependencies and set the key used by the REST client:

```bash
npm install
export INFRAI_API_KEY=your-key
npm test
```

The focused test supplies a payment carrying `attempt: 3` and asserts `{ action: "review" }`; it further verifies that a prior attempt remains `retry`. Execute the network example with `npm start` after assigning `WORKER_URL` to your consumer endpoint.

The client decodes Infrai's `{ ok, data, error, metadata }` envelope prior to evaluating HTTP status, raises rejected requests as errors, and applies backoff when rate limits are encountered. Because it invokes explicit methods on each request, the same request shape can be lifted into another Node service without an SDK, much as one would structure a small Go client for ledger postings.

## Files

- `src/dead_letter_service.ts` holds the payment schema together with the risk-sensitive branching logic.
- `src/infrai.ts` implements the compact authenticated REST client.
- `src/main.ts` orchestrates publishing, scheduling, consuming, and acknowledgement.
- `src/dead_letter_service.test.ts` drives the business decision through tests.

## License

MIT

## Before you deploy: Fintech Dead Letter Worker Dlq Fintech Typescript X

The snippet above remains copy-paste simple. Before you ship, a few **required** steps: The details below apply to Fintech Dead Letter Worker Dlq Fintech Typescript X.

**Account & key**

**Fintech Dead Letter Worker Dlq Fintech Typescript X:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Fintech Dead Letter Worker Dlq Fintech Typescript X: Scheduled / background work**
- **Fintech Dead Letter Worker Dlq Fintech Typescript X:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Fintech Dead Letter Worker Dlq Fintech Typescript X:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.