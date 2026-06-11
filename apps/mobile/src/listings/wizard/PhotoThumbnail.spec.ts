import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "PhotoThumbnail.tsx"), "utf-8");

describe("PhotoThumbnail layout", () => {
  it("keeps the tile itself square so flex-wrap grids cannot collapse image rows", () => {
    expect(source).toContain(
      'className="relative overflow-hidden rounded-lg bg-muted"',
    );
    expect(source).toContain("const tileSize = Math.max(");
    expect(source).toContain("{ width: tileSize, height: tileSize }");
    expect(source).toContain("style={StyleSheet.absoluteFillObject}");
    expect(source).not.toContain('w-[31.5%]');
    expect(source).not.toContain('className="aspect-square w-full"');
  });

  it("uses a remove button instead of a green uploaded status badge", () => {
    expect(source).toContain("accessibilityLabel={t(\"remove\")}");
    expect(source).toContain("onPress={() => onRemove(photo.photoId)}");
    expect(source).toContain("Icon as={X}");
    expect(source).not.toContain("Icon as={Check}");
    expect(source).not.toContain("bg-success-500");
  });

  it("accepts drag lifecycle handlers from the photo grid", () => {
    expect(source).toContain("onDragStart: (index: number, pageX: number, pageY: number) => void");
    expect(source).toContain("onDragMove: (pageX: number, pageY: number) => void");
    expect(source).toContain("onDragEnd: () => void");
    expect(source).toContain("onLongPress");
    expect(source).toContain("onTouchMove");
    expect(source).toContain("onPressOut");
    expect(source).toContain("dragOffset?: { x: number; y: number }");
    expect(source).toContain("{ translateX: dragOffset.x }");
    expect(source).toContain("{ translateY: dragOffset.y }");
  });
});
