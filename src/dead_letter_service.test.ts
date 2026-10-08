import assert from "node:assert/strict";
import { decideAfterFailure, parsePayment } from "./dead_letter_service.js";

const event = parsePayment({ paymentId: "pay_42", amountCents: 5000, currency: "EUR", recipient: "ops@example.com", attempt: 3 });
assert.deepEqual(decideAfterFailure(event), { paymentId: "pay_42", action: "review", reason: "payment failed three times" });
assert.equal(decideAfterFailure({ ...event, attempt: 1 }).action, "retry");
console.log("dead-letter decision test passed");
