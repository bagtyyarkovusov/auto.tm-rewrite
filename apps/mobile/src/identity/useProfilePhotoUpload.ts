import { useState } from "react";
import * as ImagePicker from "expo-image-picker";

/** System selection; upload state outlives the route in the next slice. */
export function useProfilePhotoUpload() {
  const [cameraDenied, setCameraDenied] = useState(false);

  async function pick(source: "camera" | "library") {
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setCameraDenied(true);
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1,
    };
    if (source === "camera") await ImagePicker.launchCameraAsync(options);
    else await ImagePicker.launchImageLibraryAsync(options);
  }

  return { pick, cameraDenied, dismissCameraDenied: () => setCameraDenied(false) };
}
