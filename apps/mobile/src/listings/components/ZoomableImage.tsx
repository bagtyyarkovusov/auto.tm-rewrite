import type { ReactNode } from "react";

export interface ZoomableImageProps {
  width: number;
  height: number;
  /** True for the photo the viewer is on; any other photo snaps back to 1x. */
  active: boolean;
  onZoomChange: (zoomed: boolean) => void;
  children: ReactNode;
}

/** Placeholder: the red checkpoint's tests fail until zooming is built. */
export function ZoomableImage({ children }: ZoomableImageProps) {
  return children;
}
