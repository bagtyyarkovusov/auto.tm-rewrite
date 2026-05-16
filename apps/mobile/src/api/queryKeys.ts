export const queryKeys = {
  me: () => ["me"] as const,

  catalog: {
    all: () => ["catalog"] as const,
    brands: () => [...queryKeys.catalog.all(), "brands"] as const,
    models: (brandId: string) =>
      [...queryKeys.catalog.all(), "models", brandId] as const,
    cities: () => [...queryKeys.catalog.all(), "cities"] as const,
  },

  listings: {
    all: () => ["listings"] as const,
    list: (filters: unknown) =>
      [...queryKeys.listings.all(), "list", filters] as const,
    detail: (id: string) =>
      [...queryKeys.listings.all(), "detail", id] as const,
  },

  favorites: {
    all: () => ["favorites"] as const,
    list: () => [...queryKeys.favorites.all(), "list"] as const,
  },

  conversations: {
    all: () => ["conversations"] as const,
    list: () => [...queryKeys.conversations.all(), "list"] as const,
    detail: (id: string) =>
      [...queryKeys.conversations.all(), "detail", id] as const,
  },
};
