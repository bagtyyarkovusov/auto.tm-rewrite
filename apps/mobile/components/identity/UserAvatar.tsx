import { View } from "react-native";

export interface UserAvatarProps {
  /** Diameter in points. */
  size: number;
  avatarIndex: number;
  avatarKey?: string | null;
  avatarUrl?: string | null;
  accessibilityLabel?: string;
}

export function UserAvatar(_props: UserAvatarProps) {
  return <View />;
}
