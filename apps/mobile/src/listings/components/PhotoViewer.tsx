import type { ReactNode } from "react";
import type { ListingsSchemas } from "@auto-tm/contracts";

export interface PhotoViewerProps {
  visible: boolean;
  media: ListingsSchemas.ListingMedia[];
  initialIndex: number;
  onClose: (index: number) => void;
  headerAction?: (close: () => void) => ReactNode;
  footer?: (close: () => void) => ReactNode;
}

/** Placeholder: the red checkpoint's tests fail until the viewer is built. */
export function PhotoViewer(_props: PhotoViewerProps): ReactNode {
  return null;
}
