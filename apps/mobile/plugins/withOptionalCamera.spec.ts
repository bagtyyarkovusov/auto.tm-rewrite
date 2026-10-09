import { describe, expect, it } from "vitest";

import plugin from "./withOptionalCamera";

const { addOptionalCameraFeatures } = plugin;

interface ManifestNode {
  $?: Record<string, string>;
}

interface Manifest {
  manifest: {
    "uses-feature"?: ManifestNode[];
    "uses-permission"?: ManifestNode[];
  };
}

const camera = { $: { "android:name": "android.hardware.camera", "android:required": "false" } };
const autofocus = { $: { "android:name": "android.hardware.camera.autofocus", "android:required": "false" } };

describe("the optional camera features", () => {
  it("declares the camera and autofocus features as not required", () => {
    const manifest: Manifest = { manifest: {} };

    addOptionalCameraFeatures(manifest);

    expect(manifest.manifest["uses-feature"]).toEqual([camera, autofocus]);
  });

  it("keeps the camera permission and every other feature entry", () => {
    const permission = { $: { "android:name": "android.permission.CAMERA" } };
    const touchscreen = { $: { "android:name": "android.hardware.touchscreen", "android:required": "false" } };
    const manifest: Manifest = {
      manifest: { "uses-permission": [permission], "uses-feature": [touchscreen] },
    };

    addOptionalCameraFeatures(manifest);

    expect(manifest.manifest["uses-permission"]).toEqual([permission]);
    expect(manifest.manifest["uses-feature"]).toEqual([touchscreen, camera, autofocus]);
  });

  it("turns an implied required camera optional instead of adding a second entry", () => {
    const required = { $: { "android:name": "android.hardware.camera", "android:required": "true" } };
    const manifest: Manifest = { manifest: { "uses-feature": [required] } };

    addOptionalCameraFeatures(manifest);

    expect(manifest.manifest["uses-feature"]).toEqual([
      camera,
      autofocus,
    ]);
  });

  it("adds nothing twice", () => {
    const manifest: Manifest = { manifest: {} };

    addOptionalCameraFeatures(manifest);
    addOptionalCameraFeatures(manifest);

    expect(manifest.manifest["uses-feature"]).toEqual([camera, autofocus]);
  });
});
