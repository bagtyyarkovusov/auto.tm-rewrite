import { randomUUID } from "node:crypto";

import { Queue, QueueEvents, Worker } from "bullmq";
import { describe, expect, it } from "vitest";

import { OrphanCleanupProcessor } from "./orphan-cleanup.processor";
import { VideoTranscodeProcessor } from "./video-transcode.processor";

const redisUrl = process.env["REDIS_URL"] ?? "";

// Each case owns its Redis prefix; it never consumes or clears production queues.
describe.skipIf(redisUrl === "")("unsupported worker jobs — real Redis", () => {
  it.each([
    ["video-transcode", () => new VideoTranscodeProcessor()],
    ["orphan-cleanup", () => new OrphanCleanupProcessor()],
  ] as const)("%s fails without completing or retrying", async (name, makeProcessor) => {
    const options = {
      connection: { url: redisUrl },
      prefix: `test-unsupported-${randomUUID()}`,
    };
    const queue = new Queue(name, options);
    const events = new QueueEvents(name, options);
    const processor = makeProcessor();
    let calls = 0;
    const worker = new Worker(name, async () => {
      calls += 1;
      return processor.process();
    }, options);

    try {
      await events.waitUntilReady();
      const job = await queue.add("external-job", { listingMediaId: "test-media" }, {
        attempts: 5,
        removeOnFail: false,
      });

      await expect(job.waitUntilFinished(events, 10_000)).rejects.toThrow(
        `${name} is not implemented; no work was performed`,
      );
      if (job.id === undefined) throw new Error("Queue did not assign a job ID");
      const stored = await queue.getJob(job.id);
      expect(await stored?.getState()).toBe("failed");
      expect(stored?.attemptsMade).toBe(1);
      expect(stored?.failedReason).toContain("no work was performed");
      expect(await queue.getCompletedCount()).toBe(0);
      expect(await queue.getDelayedCount()).toBe(0);
      expect(calls).toBe(1);
    } finally {
      await worker.close();
      await events.close();
      await queue.obliterate({ force: true });
      await queue.close();
    }
  }, 20_000);
});
