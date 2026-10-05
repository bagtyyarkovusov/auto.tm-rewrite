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

type Circle = readonly [cx: number, cy: number, r: number];

/** The two road wheels of a side-on vehicle. */
const wheels = (front: number, rear: number, r = 1.8): Circle[] => [
  [front, 15.5, r],
  [rear, 15.5, r],
];

/**
 * The Assigned Avatars, in the order the server's `avatarIndex` counts them.
 * The order is fixed and may only grow at the end. The drawings and hues are
 * the approved prototype's (`cabinet-profile.prototype.html`, `CARS`): original
 * line marks, no brand logos.
 */
export const CAR_AVATARS: readonly CarAvatar[] = [
  {
    name: "sedan",
    hue: 212,
    paths: ["M3 15v-2.6l2.3-.8 2.4-3.1h6.3l3.1 3.1 3.9 .9V15", "M3 15h2.2M9.8 15h4.4M18.8 15H21M11 8.5v3.2"],
    circles: wheels(7.5, 16.5),
  },
  {
    name: "hatchback",
    hue: 158,
    paths: ["M3 15v-3l2-1.1L7.6 8H14l4.2 3.6 2.8.7V15", "M3 15h2M9.6 15h4.4M18.6 15H21M11.5 8v3.6"],
    circles: wheels(7.3, 16.3),
  },
  {
    name: "suv",
    hue: 28,
    paths: ["M3 15V9.4C3 8.6 3.6 8 4.4 8H15l3.2 3.6 2.8.6V15", "M3 15h1.6M9.4 15h5.2M19.4 15H21M3 11.6h15.2M9.5 8v3.6"],
    circles: wheels(7, 17, 2),
  },
  {
    name: "pickup",
    hue: 265,
    paths: ["M3 15v-3.4h8.5V8H16l2.4 3.6 2.6.6V15", "M3 15h1.6M9.4 15h5.2M19.4 15H21M11.5 11.6h7"],
    circles: wheels(7, 17, 2),
  },
  {
    name: "van",
    hue: 190,
    paths: ["M3 15V8.2C3 7.5 3.5 7 4.2 7h11.3l4 4.6 1.5.5V15", "M3 15h1.6M9.4 15h5.2M19.4 15H21M14.5 7v4.6h5"],
    circles: wheels(7, 17, 2),
  },
  {
    name: "steering-wheel",
    hue: 42,
    paths: ["M3.8 10.4c3.2-1 5.2-.8 6.5.9M20.2 10.4c-3.2-1-5.2-.8-6.5.9M12 14.5v6"],
    circles: [[12, 12, 8.5], [12, 12.5, 2]],
  },
  {
    name: "wheel",
    hue: 338,
    paths: ["M12 3.5v5.9M12 14.6v5.9M3.9 9.4l5.6 1.8M14.5 12.8l5.6 1.8M7 18.9l3.5-4.8M13.5 9.9L17 5.1"],
    circles: [[12, 12, 8.5], [12, 12, 2.6]],
  },
  {
    name: "key",
    hue: 122,
    paths: ["M11.5 12H21M17 12v3M20 12v2.4M6.5 12h.01"],
    circles: [[7.5, 12, 4]],
  },
  {
    name: "speedometer",
    hue: 14,
    paths: ["M4.2 17a8.5 8.5 0 1 1 15.6 0", "M12 14.5l3.8-5.2", "M6.6 12.4h.01M8.6 8.6h.01M12 7.2h.01M17.4 12.4h.01"],
    circles: [[12, 14.8, 1.3]],
  },
  {
    name: "gear-shift",
    hue: 232,
    paths: ["M6 6.5v11M12 6.5v11M18 6.5V12H6"],
    circles: [[6, 5, 1.5], [12, 5, 1.5], [18, 5, 1.5], [6, 19, 1.5], [12, 19, 1.5]],
  },
  {
    name: "road",
    hue: 285,
    paths: ["M8.5 3L4 21M15.5 3L20 21M12 4v3M12 10.5v3M12 17v3"],
    circles: [],
  },
  {
    name: "headlight",
    hue: 82,
    paths: ["M10 6a6 6 0 0 0 0 12c1.6 0 3-2.6 3-6s-1.4-6-3-6z", "M16 8h4.5M16 12h5M16 16h4.5"],
    circles: [],
  },
];

/**
 * The mark for any `avatarIndex`. An index this build does not have wraps
 * around the set, so a newer server never leaves an older app without a mark.
 */
export function carAvatarAt(index: number): CarAvatar {
  const count = CAR_AVATARS.length;
  const whole = Number.isFinite(index) ? Math.trunc(index) : 0;
  return CAR_AVATARS[((whole % count) + count) % count] as CarAvatar;
}

/**
 * The circle and stroke colours of a mark: a dark mark on a pale tint in light
 * theme, a pale mark on a deep tint in dark. These twelve hues are the only
 * colours here that are not app tokens.
 */
export function carAvatarTint(avatar: CarAvatar, scheme: "light" | "dark"): CarAvatarTint {
  return scheme === "dark"
    ? { background: `hsl(${avatar.hue}, 26%, 22%)`, foreground: `hsl(${avatar.hue}, 58%, 80%)` }
    : { background: `hsl(${avatar.hue}, 46%, 89%)`, foreground: `hsl(${avatar.hue}, 48%, 28%)` };
}
