import { AppState, type AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import type { NetInfoState } from "@react-native-community/netinfo";

export interface ResumeCallbacks {
  onAppActive?: () => void;
  onNetworkAvailable?: () => void;
  resumePendingUploads?: () => void;
}

export function setupUploadResume(callbacks: ResumeCallbacks): () => void {
  const handleAppStateChange = (status: AppStateStatus) => {
    if (status === "active") {
      callbacks.onAppActive?.();
      // When app becomes active, also check network and resume if available
      NetInfo.fetch().then((state) => {
        if (state.isConnected) {
          callbacks.onNetworkAvailable?.();
          callbacks.resumePendingUploads?.();
        }
      });
    }
  };

  const handleNetworkChange = (state: NetInfoState) => {
    if (state.isConnected) {
      callbacks.onNetworkAvailable?.();
      callbacks.resumePendingUploads?.();
    }
  };

  const appStateSub = AppState.addEventListener("change", handleAppStateChange);
  const netInfoSub = NetInfo.addEventListener(handleNetworkChange);

  return () => {
    appStateSub.remove();
    netInfoSub();
  };
}
