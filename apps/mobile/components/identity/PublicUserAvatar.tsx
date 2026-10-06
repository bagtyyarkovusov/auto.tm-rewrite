import { View } from "react-native";
import { User } from "lucide-react-native";

import { UserAvatar } from "./UserAvatar";

import { Icon } from "@/components/ui/icon";
import { buildVariantUrl } from "@/src/listings/detail/buildVariantUrl";

export interface PublicUserAvatarProps {
  /** Diameter in points. */
  size: number;
  /** The avatar fields of another User's public identity. */
  user: { avatarIndex: number; avatarKey: string | null; deleted: boolean };
}

/**
 * Another User's avatar, where the name is written beside it: their profile
 * photo, their car mark, or the neutral person icon for a deleted User, who
 * never gets a car. A screen reader skips it; the name says who it is.
 *
 * The photo is the thumbnail variant of the photo key. No size here is above
 * 44 points, and a row of them asks the API for nothing.
 */
export function PublicUserAvatar({ size, user }: PublicUserAvatarProps) {
  if (user.deleted) {
    return (
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="items-center justify-center bg-muted"
        // The size is data, so it is a style value, not a class.
        style={{ width: size, height: size, borderRadius: size / 2 }}
      >
        <Icon as={User} className="text-muted-foreground" size={Math.round(size * 0.5)} />
      </View>
    );
  }

  return (
    <UserAvatar
      size={size}
      avatarIndex={user.avatarIndex}
      avatarKey={user.avatarKey}
      avatarUrl={user.avatarKey ? buildVariantUrl(user.avatarKey, "thumbnail") : null}
    />
  );
}
