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

export async function compressPhoto(
  sourceUri: string,
  destinationUri: string,
): Promise<CompressionResult> {
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

  return {
    uri: destinationUri,
    width: result.width,
    height: result.height,
    fileSize,
  };
}
