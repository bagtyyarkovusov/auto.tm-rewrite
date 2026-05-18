import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";

export interface CompressionResult {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
}

const MAX_DIMENSION = 2400;
const JPEG_QUALITY = 0.8;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export class CompressionError extends Error {
  constructor(
    message: string,
    public readonly code: "SOURCE_MISSING" | "DESTINATION_MISSING" | "MANIPULATION_FAILED",
  ) {
    super(message);
    this.name = "CompressionError";
  }
}

export async function compressPhoto(
  sourceUri: string,
  destinationUri: string,
): Promise<CompressionResult> {
  // Checkpoint 1: verify source file exists before manipulation
  const sourceInfo = await FileSystem.getInfoAsync(sourceUri);
  if (!sourceInfo.exists) {
    throw new CompressionError(
      "Photo file missing — please remove and re-select",
      "SOURCE_MISSING",
    );
  }

  try {
    const context = ImageManipulator.manipulate(sourceUri);
    context.resize({ width: MAX_DIMENSION });
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: JPEG_QUALITY,
    });

    // Check file size and re-compress with lower quality if needed
    let finalUri = result.uri;
    let fileInfo = await FileSystem.getInfoAsync(finalUri);
    let fileSize = fileInfo.exists && "size" in fileInfo ? fileInfo.size : 0;

    if (fileSize > MAX_FILE_SIZE_BYTES) {
      const recompressContext = ImageManipulator.manipulate(finalUri);
      const recompressed = await recompressContext.renderAsync();
      const recompressResult = await recompressed.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.6,
      });
      finalUri = recompressResult.uri;
      fileInfo = await FileSystem.getInfoAsync(finalUri);
      fileSize = fileInfo.exists && "size" in fileInfo ? fileInfo.size : 0;
    }

    // Move to destination if different
    if (finalUri !== destinationUri) {
      await FileSystem.moveAsync({ from: finalUri, to: destinationUri });
    }

    // Checkpoint 2: verify destination file exists after move
    const destInfo = await FileSystem.getInfoAsync(destinationUri);
    if (!destInfo.exists) {
      throw new CompressionError(
        "Photo file missing — please remove and re-select",
        "DESTINATION_MISSING",
      );
    }

    return {
      uri: destinationUri,
      width: result.width,
      height: result.height,
      fileSize,
    };
  } catch (err) {
    if (err instanceof CompressionError) {
      throw err;
    }
    throw new CompressionError(
      err instanceof Error ? err.message : "Compression failed",
      "MANIPULATION_FAILED",
    );
  }
}
