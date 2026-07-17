export const notificationsQueryKeys = {
  all: () => ["notifications"] as const,
  pushTokens: () =>
    [...notificationsQueryKeys.all(), "push-tokens"] as const,
};
