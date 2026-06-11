import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "Step2Photos.tsx"), "utf-8");

describe("Step2Photos photo ordering", () => {
  it("wires long-press drag state into photo reorder callbacks", () => {
    expect(source).toContain("getDragTargetIndex");
    expect(source).toContain("reorderPhotoIdsByIndex");
    expect(source).toContain("draggingIndex");
    expect(source).toContain("handleDragStart");
    expect(source).toContain("handleDragMove");
    expect(source).toContain("handleDragEnd");
    expect(source).toContain("dragOffset");
    expect(source).toContain("setDragOffset({ x: pageX - start.pageX, y: pageY - start.pageY })");
    expect(source).toContain("onReorderPhotos(reorderedIds)");
  });

  it("passes drag lifecycle handlers to each photo thumbnail", () => {
    expect(source).toContain("onDragStart={handleDragStart}");
    expect(source).toContain("onDragMove={handleDragMove}");
    expect(source).toContain("onDragEnd={handleDragEnd}");
    expect(source).toContain("isDragging={draggingIndex === index}");
    expect(source).toContain("dragOffset={draggingIndex === index ? dragOffset : undefined}");
  });
});
