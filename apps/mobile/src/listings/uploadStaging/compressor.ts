import * as ImageManipulator from "expo-image-manipulator";
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
  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: MAX_DIMENSION } }],
    {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  // Check file size and re-compress with lower quality if needed
  let finalUri = manipulated.uri;
  let fileInfo = await FileSystem.getInfoAsync(finalUri);
  let fileSize = fileInfo.exists && "size" in fileInfo ? fileInfo.size : 0;

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    const recompressed = await ImageManipulator.manipulateAsync(
      finalUri,
      [],
      {
        compress: 0.6,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    finalUri = recompressed.uri;
    fileInfo = await FileSystem.getInfoAsync(finalUri);
    fileSize = fileInfo.exists && "size" in fileInfo ? fileInfo.size : 0;
  }

  // Move to destination if different
  if (finalUri !== destinationUri) {
    await FileSystem.moveAsync({ from: finalUri, to: destinationUri });
  }

  return {
    uri: destinationUri,
    width: manipulated.width,
    height: manipulated.height,
    fileSize,
  };
}
