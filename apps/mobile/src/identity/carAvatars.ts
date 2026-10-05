/** One bundled car avatar: a line mark on a 24 by 24 grid and the hue of its tint. */
export interface CarAvatar {
  name: string;
  hue: number;
  paths: readonly string[];
  circles: readonly (readonly [cx: number, cy: number, r: number])[];
}

export interface CarAvatarTint {
  background: string;
  foreground: string;
}

export const CAR_AVATARS: readonly CarAvatar[] = [];

export function carAvatarAt(_index: number): CarAvatar | undefined {
  return undefined;
}

export function carAvatarTint(_avatar: CarAvatar, _scheme: "light" | "dark"): CarAvatarTint {
  return { background: "", foreground: "" };
}
