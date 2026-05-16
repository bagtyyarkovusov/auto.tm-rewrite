import { existsSync } from "node:fs";
import { resolve } from "node:path";

const hadOtpTestMode = "OTP_TEST_MODE" in process.env;

const envPath = resolve(__dirname, "../.env");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

// Tests expect OTP_TEST_MODE to be unset by default (the first describe block
// asserts testCode is undefined). If it came from .env rather than the shell,
// remove it so the suite runs clean. Tests that need test mode explicitly set
// it in their beforeAll.
if (!hadOtpTestMode) {
  delete process.env["OTP_TEST_MODE"];
}
