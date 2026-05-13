// PascalCase keys, snake_case values

export const UserRole = {
  Buyer: "buyer",
  Seller: "seller",
  DealerOwner: "dealer_owner",
  DealerMember: "dealer_member",
  Admin: "admin",
  SuperAdmin: "super_admin",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ListingStatus = {
  Draft: "draft",
  Published: "published",
  Sold: "sold",
  Archived: "archived",
} as const;
export type ListingStatus = (typeof ListingStatus)[keyof typeof ListingStatus];

export const Currency = {
  TMT: "TMT",
  USD: "USD",
  AED: "AED",
} as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

export const MessageKind = {
  Text: "text",
  Image: "image",
  PostRef: "post_ref",
  System: "system",
} as const;
export type MessageKind = (typeof MessageKind)[keyof typeof MessageKind];

export const NotificationCategory = {
  DirectMessages: "direct_messages",
  SavedSearchMatches: "saved_search_matches",
  ListingActivity: "listing_activity",
  AdminAnnouncements: "admin_announcements",
  BlogActivity: "blog_activity",
  Marketing: "marketing",
} as const;
export type NotificationCategory =
  (typeof NotificationCategory)[keyof typeof NotificationCategory];

export const Locale = {
  Ru: "ru",
  Tk: "tk",
  En: "en",
} as const;
export type Locale = (typeof Locale)[keyof typeof Locale];
