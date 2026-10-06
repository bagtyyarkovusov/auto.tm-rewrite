import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { DemoPhoto } from "../scripts/demo-inventory/manifest";
import { createCommonsPhotoSource } from "../scripts/demo-inventory/photos";

// No test reaches Commons: the download is a function the test supplies.
const photo = {
  url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Car.jpg/1920px-Car.jpg",
  sourceFile: "File:Car.jpg",
} as DemoPhoto;

describe("demo inventory photo download", () => {
  let cacheDir: string;
  let jpeg: Buffer;

  beforeEach(async () => {
    cacheDir = await mkdtemp(path.join(tmpdir(), "demo-photos-"));
    jpeg = await sharp({ create: { width: 32, height: 24, channels: 3, background: "#7a8fa3" } }).jpeg().toBuffer();
  });
  afterEach(async () => {
    await rm(cacheDir, { recursive: true, force: true });
  });

  const answering = (...bodies: (Buffer | string)[]) => {
    const requests: string[] = [];
    const fetch = async (url: string) => {
      requests.push(url);
      return new Response(bodies[Math.min(requests.length, bodies.length) - 1]);
    };
    return { requests, fetch };
  };

  it("keeps a downloaded photo, so a rerun asks Commons for nothing", async () => {
    const { requests, fetch } = answering(jpeg);
    const source = createCommonsPhotoSource(cacheDir, { fetch, pauseMs: 0 });

    expect(await source.load(photo)).toEqual(jpeg);
    expect(await source.load(photo)).toEqual(jpeg);
    expect(requests).toEqual([photo.url]);
  });

  it("names the file and keeps nothing when Commons answers 200 with something that is not a photo", async () => {
    const { requests, fetch } = answering("<html>Too many requests</html>", jpeg);
    const source = createCommonsPhotoSource(cacheDir, { fetch, pauseMs: 0 });

    await expect(source.load(photo)).rejects.toThrow("Failed to download File:Car.jpg: the answer is not an image");
    expect(await readdir(cacheDir)).toEqual([]);
    // The next run downloads again instead of reading the bad answer back.
    expect(await source.load(photo)).toEqual(jpeg);
    expect(requests).toHaveLength(2);
  });
});
