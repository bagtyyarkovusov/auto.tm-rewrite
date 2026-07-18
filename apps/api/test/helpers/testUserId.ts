const TEST_USER_IDS = {
  "user-1": "10000000-0000-4000-8000-000000000001",
  "user-2": "10000000-0000-4000-8000-000000000002",
  "seller-1": "20000000-0000-4000-8000-000000000001",
  "buyer-1": "20000000-0000-4000-8000-000000000002",
  "admin-1": "20000000-0000-4000-8000-000000000003",
} as const;

type TestUserAlias = keyof typeof TEST_USER_IDS;

export function testUserId(alias: TestUserAlias): string {
  return TEST_USER_IDS[alias];
}
