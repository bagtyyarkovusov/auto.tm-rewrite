import assert from "node:assert/strict";
import test from "node:test";

import { base32Decode, formatDetail, totp } from "./staging-reviewer-flow-smoke.mjs";

// RFC 4648 §10 base32 test vectors.
test("base32Decode matches the RFC 4648 vectors", () => {
  assert.equal(base32Decode("MZXW6===").toString("utf8"), "foo");
  assert.equal(base32Decode("MZXW6YTB").toString("utf8"), "fooba");
  assert.equal(base32Decode("MZXW6YTBOI======").toString("utf8"), "foobar");
});

test("base32Decode rejects a non-base32 character", () => {
  assert.throws(() => base32Decode("MZXW6!"), /Invalid base32 character/);
});

// RFC 6238 appendix B, SHA-1 variant. The published vectors are 8-digit; the
// admin endpoint takes 6, so these are the same counters truncated to 6.
test("totp matches the RFC 6238 SHA-1 vectors", () => {
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"; // "12345678901234567890"
  assert.equal(totp(secret, 59_000), "287082");
  assert.equal(totp(secret, 1_111_111_109_000), "081804");
  assert.equal(totp(secret, 1_234_567_890_000), "005924");
  assert.equal(totp(secret, 2_000_000_000_000), "279037");
});

test("totp is stable inside a 30-second window and changes across one", () => {
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  assert.equal(totp(secret, 60_000), totp(secret, 89_999));
  assert.notEqual(totp(secret, 60_000), totp(secret, 90_000));
});

test("formatDetail keeps the timing when there is no detail", () => {
  assert.equal(formatDetail("listingId=abc", 120), "listingId=abc, 120ms");
  assert.equal(formatDetail(undefined, 120), "120ms");
  assert.equal(formatDetail("", 120), "120ms");
});
