import { useState, type PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import type { ConversationsSchemas, ListingsSchemas } from "@auto-tm/contracts";

import { act, fireEvent, renderMobile, routeParams, routerMock } from "../render";
import ConversationDetailScreen from "../../app/conversations/[id]";
import { seedConversationDetail } from "../../src/api/conversations/useConversation";
import type * as ClientModule from "../../src/api/client";

const CONVERSATION_ID = "00000000-0000-4000-8000-0000000000c1";
const LISTING_ID = "00000000-0000-4000-8000-0000000000a1";
const BUYER_ID = "00000000-0000-4000-8000-0000000000b1";
const SELLER_ID = "00000000-0000-4000-8000-0000000000b2";
const SELLER_PHONE = "+99361000000";

const state = vi.hoisted(() => ({
  viewerId: "",
  get: vi.fn(),
  post: vi.fn(),
  sendText: vi.fn(),
  messages: {
    data: { pages: [{ items: [] as unknown[] }] } as unknown,
    isPending: false,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  mutation: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
}));

vi.mock("../../src/auth/useViewer", () => ({ useViewer: () => ({ userId: state.viewerId }) }));
vi.mock("../../src/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof ClientModule>()),
  apiClient: { get: state.get, post: state.post, delete: vi.fn() },
}));
vi.mock("../../src/api/conversations/useConversationMessages", () => ({
  useConversationMessages: () => state.messages,
}));
vi.mock("../../src/api/conversations/useSendTextMessage", () => ({ useSendTextMessage: () => state.mutation }));
vi.mock("../../src/api/conversations/useSendImageMessage", () => ({ useSendImageMessage: () => state.mutation }));
vi.mock("../../src/api/conversations/usePresignChatAttachment", () => ({ usePresignChatAttachment: () => state.mutation }));
vi.mock("../../src/api/conversations/useUpdateWatermark", () => ({ useUpdateWatermark: () => state.mutation }));
vi.mock("../../src/api/conversations/useDeleteMessage", () => ({ useDeleteMessage: () => state.mutation }));
vi.mock("../../src/api/conversations/useMuteConversation", () => ({ useMuteConversation: () => state.mutation }));
vi.mock("../../src/api/identity/useBlockUser", () => ({ useBlockUser: () => state.mutation }));
vi.mock("../../src/api/identity/useUnblockUser", () => ({ useUnblockUser: () => state.mutation }));
vi.mock("../../src/auth/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, phone: "" }) }));
vi.mock("../../src/api/catalog/useBrands", () => ({
  useBrands: () => ({ data: { items: [{ id: "00000000-0000-4000-8000-0000000000d1", name: "Toyota" }] } }),
}));
vi.mock("../../src/api/catalog/useModels", () => ({
  useModels: () => ({ data: { items: [{ id: "00000000-0000-4000-8000-0000000000d2", name: "Camry" }] } }),
}));
vi.mock("../../src/navigation/useSafeBack", () => ({ useSafeBack: () => vi.fn() }));
vi.mock("../../src/conversations/socket/useConversationSocket", () => ({
  useConversationSocket: () => ({
    peerTyping: false,
    peerPresence: { online: true },
    signalTyping: vi.fn(),
    stopTyping: vi.fn(),
    sendTextMessage: state.sendText,
    sendImageMessage: vi.fn(),
    markRead: vi.fn(async () => ({ ok: true })),
    deleteMessage: vi.fn(),
  }),
}));
vi.mock("../../src/conversations/components/useConversationCatalogMaps", () => ({
  useConversationCatalogMaps: () => ({ brandName: () => undefined, modelName: () => undefined }),
}));
vi.mock("../../src/conversations/components/ImagePreviewModal", () => ({ ImagePreviewModal: () => null }));
vi.mock("../../src/admin/components/MessageReportSheet", () => ({ MessageReportSheet: () => null }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ show: vi.fn() }) }));
vi.mock("../../lib/theme", () => ({
  THEME: { light: { mutedForeground: "0 0% 45%" }, dark: { mutedForeground: "0 0% 60%" } },
}));
vi.mock("../../src/conversations/upload/chatImageUpload", () => ({
  uploadChatImageToPresignedUrl: vi.fn(),
  compressChatImage: vi.fn(),
  getChatImageStagingPath: vi.fn(),
  ensureChatStagingDir: vi.fn(),
  ChatImageUploadError: class extends Error {},
}));
vi.mock("expo-image-picker", () => ({
  useMediaLibraryPermissions: () => [{ granted: true }, vi.fn()],
  launchImageLibraryAsync: vi.fn(),
}));
vi.mock("expo-file-system/legacy", () => ({ deleteAsync: vi.fn(async () => {}) }));
vi.mock("expo-linking", () => ({
  canOpenURL: vi.fn(async () => true),
  openURL: vi.fn(async () => {}),
  openSettings: vi.fn(),
}));

function conversation(
  updates: Partial<ConversationsSchemas.GetConversationResponse> = {},
): ConversationsSchemas.GetConversationResponse {
  return {
    id: CONVERSATION_ID,
    listing: {
      id: LISTING_ID,
      brandId: "00000000-0000-4000-8000-0000000000d1",
      modelId: "00000000-0000-4000-8000-0000000000d2",
      year: 2018,
      displayPriceTmt: 285000,
      priceCurrency: "TMT",
      status: "active",
    },
    buyerId: BUYER_ID,
    sellerId: SELLER_ID,
    myRole: "buyer",
    peer: { id: SELLER_ID, displayName: "Merdan" },
    blockedByMe: false,
    updatedAt: "2026-10-01T10:00:00.000Z",
    unreadCount: 0,
    mutedAt: null,
    sendRestriction: null,
    ...updates,
  };
}

function listingDetail(
  updates: Partial<ListingsSchemas.ListingDetail> = {},
): Partial<ListingsSchemas.ListingDetail> {
  return { id: LISTING_ID, status: "active", allowCalls: true, contactPhone: SELLER_PHONE, ...updates };
}

/** Answers GET by path; anything unrouted stays pending, like a slow network. */
function routeGet(routes: Record<string, () => unknown>) {
  state.get.mockImplementation((path: string) => {
    const route = routes[path];
    return route ? Promise.resolve().then(route) : new Promise(() => {});
  });
}

beforeEach(() => {
  state.viewerId = BUYER_ID;
  state.get.mockReset();
  state.post.mockReset();
  state.sendText.mockReset();
  state.mutation.mutate.mockReset();
  state.messages.isPending = false;
  state.messages.isError = false;
  state.messages.error = null;
  state.messages.data = { pages: [{ items: [] }] };
  state.messages.refetch.mockReset();
  vi.mocked(Linking.openURL).mockClear();
  routeParams.id = CONVERSATION_ID;
});

describe("Conversation opened with only its ID", () => {
  it("loads the header and Listing strip by ID, as from a push", async () => {
    routeGet({
      [`/conversations/${CONVERSATION_ID}`]: () => conversation(),
      [`/listings/${LISTING_ID}`]: () => listingDetail(),
    });
    const screen = renderMobile(<ConversationDetailScreen />);

    expect(await screen.findByText("Merdan")).toBeTruthy();
    expect(screen.getByText("M", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText("online")).toBeTruthy();
    expect(screen.getByText("2018 Toyota Camry")).toBeTruthy();
    expect(screen.getByText("285,000 TMT")).toBeTruthy();
    expect(screen.getByText("No messages yet. Start the conversation.")).toBeTruthy();
    expect(screen.queryByText("Messages")).toBeNull();
    expect(state.get).toHaveBeenCalledWith(`/conversations/${CONVERSATION_ID}`, expect.anything());
  });

  it("opens the Listing from the strip", async () => {
    routeGet({ [`/conversations/${CONVERSATION_ID}`]: () => conversation() });
    const screen = renderMobile(<ConversationDetailScreen />);

    fireEvent.press(await screen.findByRole("button", { name: "Open: 2018 Toyota Camry, 285,000 TMT" }));
    expect(routerMock.push).toHaveBeenCalledWith(`/(public)/listings/${LISTING_ID}`);
  });

  it("shows header and strip skeletons while the Conversation loads", () => {
    routeGet({});
    const screen = renderMobile(<ConversationDetailScreen />);

    expect(screen.getByTestId("conversation-header-skeleton")).toBeTruthy();
    expect(screen.getByTestId("conversation-listing-skeleton")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Go back" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Conversation actions" })).toBeNull();
  });

  it("shows ErrorState with Retry when the Conversation fails to load", async () => {
    state.get.mockRejectedValue(new Error("offline"));
    const screen = renderMobile(<ConversationDetailScreen />);

    const retry = await screen.findByRole("button", { name: /Retry|Try again/ });
    expect(screen.queryByTestId("conversation-header-skeleton")).toBeNull();
    expect(screen.queryByText("Is the car still available?")).toBeNull();
    state.get.mockClear();
    await act(async () => {
      fireEvent.press(retry);
    });
    expect(state.get).toHaveBeenCalledWith(`/conversations/${CONVERSATION_ID}`, expect.anything());
  });

  it("shows ErrorState with Retry when the Messages fail to load", async () => {
    routeGet({ [`/conversations/${CONVERSATION_ID}`]: () => conversation() });
    state.messages.isError = true;
    state.messages.error = new Error("offline");
    const screen = renderMobile(<ConversationDetailScreen />);

    expect(await screen.findByText("Merdan")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: /Retry|Try again/ }));
    expect(state.messages.refetch).toHaveBeenCalled();
  });
});

describe("Conversation opened from cached data", () => {
  it("draws the header and strip at once from the seeded summary, then refreshes", async () => {
    let resolveDetail: (value: unknown) => void = () => {};
    state.get.mockImplementation((path: string) =>
      path === `/conversations/${CONVERSATION_ID}`
        ? new Promise((resolve) => { resolveDetail = resolve; })
        : new Promise(() => {}),
    );
    // A list row or an open response: the summary without the send restriction.
    const { sendRestriction, ...summary } = conversation({ peer: { id: SELLER_ID, displayName: "Cached" } });
    expect(sendRestriction).toBeNull();
    function Seeded({ children }: PropsWithChildren) {
      const queryClient = useQueryClient();
      useState(() => seedConversationDetail(queryClient, summary));
      return children;
    }
    const screen = renderMobile(<Seeded><ConversationDetailScreen /></Seeded>);

    expect(screen.getByText("Cached")).toBeTruthy();
    expect(screen.getByText("2018 Toyota Camry")).toBeTruthy();
    expect(screen.queryByTestId("conversation-header-skeleton")).toBeNull();
    expect(state.get).toHaveBeenCalledWith(`/conversations/${CONVERSATION_ID}`, expect.anything());

    await act(async () => {
      resolveDetail(conversation({ peer: { id: SELLER_ID, displayName: "Fresh" } }));
    });
    expect(await screen.findByText("Fresh")).toBeTruthy();
  });
});

describe("Conversation header Call", () => {
  it("dials the Listing contact phone for the buyer of an active Listing that allows calls", async () => {
    routeGet({
      [`/conversations/${CONVERSATION_ID}`]: () => conversation(),
      [`/listings/${LISTING_ID}`]: () => listingDetail(),
    });
    const screen = renderMobile(<ConversationDetailScreen />);

    const call = await screen.findByRole("button", { name: "Call the seller" });
    await act(async () => {
      fireEvent.press(call);
    });
    expect(Linking.openURL).toHaveBeenCalledWith(`tel:${SELLER_PHONE}`);
  });

  it("shows no Call to the seller and never reads the Listing contact", async () => {
    state.viewerId = SELLER_ID;
    routeGet({
      [`/conversations/${CONVERSATION_ID}`]: () =>
        conversation({ myRole: "seller", peer: { id: BUYER_ID, displayName: null } }),
      [`/listings/${LISTING_ID}`]: () => listingDetail(),
    });
    const screen = renderMobile(<ConversationDetailScreen />);

    expect(await screen.findByText("Buyer")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Call the seller" })).toBeNull();
    expect(state.get).not.toHaveBeenCalledWith(`/listings/${LISTING_ID}`, expect.anything());
  });

  it.each([
    ["calls are off", listingDetail({ allowCalls: false })],
    ["there is no contact phone", listingDetail({ contactPhone: undefined })],
    ["the Listing is sold", listingDetail({ status: "sold" })],
  ])("hides Call when %s", async (_case, detail) => {
    routeGet({
      [`/conversations/${CONVERSATION_ID}`]: () => conversation(),
      [`/listings/${LISTING_ID}`]: () => detail,
    });
    const screen = renderMobile(<ConversationDetailScreen />);

    expect(await screen.findByText("Merdan")).toBeTruthy();
    // Let the Listing detail answer reach the screen before asserting Call stays hidden.
    await vi.waitFor(() =>
      expect(state.get).toHaveBeenCalledWith(`/listings/${LISTING_ID}`, expect.anything()),
    );
    await act(async () => {
      const index = state.get.mock.calls.findIndex(([path]) => path === `/listings/${LISTING_ID}`);
      await state.get.mock.results[index]?.value;
    });
    await act(async () => {});
    expect(screen.queryByRole("button", { name: "Call the seller" })).toBeNull();
  });

  it("hides Call and shows the unavailable strip when the Listing is gone", async () => {
    routeGet({
      [`/conversations/${CONVERSATION_ID}`]: () =>
        conversation({ listing: null, peer: { id: SELLER_ID, displayName: null } }),
    });
    const screen = renderMobile(<ConversationDetailScreen />);

    expect(await screen.findByText("Private seller")).toBeTruthy();
    expect(screen.getByText("Listing unavailable")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Open:/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Call the seller" })).toBeNull();
  });
});

describe("Conversation menu", () => {
  it("reports the other participant as a User and ends on the thanks screen", async () => {
    routeGet({ [`/conversations/${CONVERSATION_ID}`]: () => conversation() });
    state.post.mockResolvedValue({
      reportId: "00000000-0000-4000-8000-0000000000e1",
      status: "pending",
      createdAt: "2026-10-02T10:00:00.000Z",
      reusedExisting: false,
    });
    const screen = renderMobile(<ConversationDetailScreen />);

    fireEvent.press(await screen.findByRole("button", { name: "Conversation actions" }));
    fireEvent.press(screen.getByRole("button", { name: "Report" }));

    // The reasons the API accepts for a User report.
    for (const reason of ["Spam", "Scam or fraud", "Misleading information", "Harassment", "Other"]) {
      expect(screen.getByRole("radio", { name: reason })).toBeTruthy();
    }
    expect(screen.queryByRole("radio", { name: "Wrong category" })).toBeNull();

    fireEvent.press(screen.getByRole("radio", { name: "Other" }));
    fireEvent.changeText(screen.getByPlaceholderText("Describe the issue..."), "Asks for prepayment");
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Submit report" }));
    });

    expect(state.post).toHaveBeenCalledWith(
      `/users/${SELLER_ID}/report`,
      { reason: "other", details: "Asks for prepayment" },
      expect.anything(),
    );
    expect(await screen.findByRole("button", { name: "Done" })).toBeTruthy();
  });

  it("ends on the thanks screen when a pending report of the same User is reused", async () => {
    routeGet({ [`/conversations/${CONVERSATION_ID}`]: () => conversation() });
    state.post.mockResolvedValue({
      reportId: "00000000-0000-4000-8000-0000000000e1",
      status: "pending",
      createdAt: "2026-10-01T10:00:00.000Z",
      reusedExisting: true,
    });
    const screen = renderMobile(<ConversationDetailScreen />);

    fireEvent.press(await screen.findByRole("button", { name: "Conversation actions" }));
    fireEvent.press(screen.getByRole("button", { name: "Report" }));
    fireEvent.press(screen.getByRole("radio", { name: "Spam" }));
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Submit report" }));
    });

    expect(state.post).toHaveBeenCalledWith(`/users/${SELLER_ID}/report`, { reason: "spam" }, expect.anything());
    expect(await screen.findByRole("button", { name: "Done" })).toBeTruthy();
  });

  it("hides Report when reporting is switched off for the environment", async () => {
    routeGet({
      [`/conversations/${CONVERSATION_ID}`]: () => conversation(),
      "/config": () => ({
        reportEntryEnabled: false,
        adminModerationActionsEnabled: false,
        inspectionInterestEnabled: false,
      }),
    });
    const screen = renderMobile(<ConversationDetailScreen />);

    await vi.waitFor(() => expect(state.get).toHaveBeenCalledWith("/config", expect.anything()));
    await act(async () => {});
    fireEvent.press(await screen.findByRole("button", { name: "Conversation actions" }));
    expect(screen.getByRole("button", { name: "Block user" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Report" })).toBeNull();
  });

  it("asks before blocking, then replaces the composer with the blocked banner", async () => {
    // The refresh after Block stays pending, so only the cache patch can switch the footer.
    let refreshing = false;
    routeGet({
      [`/conversations/${CONVERSATION_ID}`]: () => (refreshing ? new Promise(() => {}) : conversation()),
    });
    state.mutation.mutate.mockImplementation((_input: unknown, options?: { onSuccess?: () => void }) => {
      refreshing = true;
      options?.onSuccess?.();
    });
    const screen = renderMobile(<ConversationDetailScreen />);

    fireEvent.press(await screen.findByRole("button", { name: "Conversation actions" }));
    fireEvent.press(screen.getByRole("button", { name: "Block user" }));
    expect(screen.getByText("Block this user?")).toBeTruthy();
    expect(
      screen.getByText("You will stop receiving messages and notifications from this user. The history stays."),
    ).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByText("Block"));
    });

    expect(state.mutation.mutate).toHaveBeenCalledWith({ userId: SELLER_ID }, expect.anything());
    expect(screen.getByText("User blocked")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Send message" })).toBeNull();
  });
});

describe("Conversation blocked by the viewer", () => {
  const blocked = () => conversation({ blockedByMe: true, sendRestriction: "blocked_by_me" });

  it("shows only the banner under readable Messages, from the loaded Conversation", async () => {
    routeGet({ [`/conversations/${CONVERSATION_ID}`]: blocked });
    state.messages.data = {
      pages: [
        {
          items: [
            {
              id: "00000000-0000-4000-8000-0000000000f1",
              conversationId: CONVERSATION_ID,
              senderId: SELLER_ID,
              kind: "text",
              text: "Yes, it is available",
              createdAt: "2026-10-01T09:00:00.000Z",
            },
          ],
        },
      ],
    };
    const screen = renderMobile(<ConversationDetailScreen />);

    expect(await screen.findByText("User blocked")).toBeTruthy();
    expect(screen.getByText("Yes, it is available")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Send message" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Attach photo" })).toBeNull();
    expect(state.get).not.toHaveBeenCalledWith(`/me/blocked-users/${SELLER_ID}`, expect.anything());
  });

  it("asks before unblocking and brings the composer back without reloading", async () => {
    // The refresh after Unblock stays pending, so only the cache patch can bring the composer back.
    let refreshing = false;
    routeGet({ [`/conversations/${CONVERSATION_ID}`]: () => (refreshing ? new Promise(() => {}) : blocked()) });
    state.mutation.mutate.mockImplementation((_input: unknown, options?: { onSuccess?: () => void }) => {
      refreshing = true;
      options?.onSuccess?.();
    });
    const screen = renderMobile(<ConversationDetailScreen />);

    fireEvent.press(await screen.findByRole("button", { name: "Unblock" }));
    expect(screen.getByText("Unblock this user?")).toBeTruthy();
    expect(screen.getByText("After unblocking, the user can message you again.")).toBeTruthy();
    await act(async () => {
      // The banner's Unblock, then the dialog's.
      const [, confirm] = screen.getAllByText("Unblock");
      fireEvent.press(confirm);
    });

    expect(state.mutation.mutate).toHaveBeenCalledWith({ userId: SELLER_ID }, expect.anything());
    expect(screen.queryByText("User blocked")).toBeNull();
    expect(screen.getByRole("button", { name: "Send message" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Attach photo", disabled: false })).toBeTruthy();
  });
});

describe("Conversation about a closed Listing", () => {
  const SELLER_MESSAGE = {
    id: "00000000-0000-4000-8000-0000000000f1",
    conversationId: CONVERSATION_ID,
    senderId: SELLER_ID,
    kind: "text",
    text: "Thanks, already sold",
    createdAt: "2026-10-01T09:00:00.000Z",
  };
  const withListing = (status: "sold" | "archived") => {
    const base = conversation();
    return conversation({ listing: base.listing && { ...base.listing, status } });
  };

  it("shows the Sold badge, the banner and the link after the last Message, with the composer on", async () => {
    routeGet({ [`/conversations/${CONVERSATION_ID}`]: () => withListing("sold") });
    state.messages.data = { pages: [{ items: [SELLER_MESSAGE] }] };
    const screen = renderMobile(<ConversationDetailScreen />);

    expect(await screen.findByText("Sold")).toBeTruthy();
    expect(screen.getByText("Thanks, already sold")).toBeTruthy();
    expect(
      screen.getByText("This car is sold. You can keep talking, but the Listing is no longer available."),
    ).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "See other Toyota Camry" }));
    expect(routerMock.push).toHaveBeenCalledWith({
      pathname: "/(tabs)/(search)/results",
      params: { brandId: "00000000-0000-4000-8000-0000000000d1", modelId: "00000000-0000-4000-8000-0000000000d2" },
    });
    expect(screen.getByPlaceholderText("Message")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send message" })).toBeTruthy();
  });

  it("shows no quick replies on a sold Listing, even with no Messages yet", async () => {
    routeGet({ [`/conversations/${CONVERSATION_ID}`]: () => withListing("sold") });
    const screen = renderMobile(<ConversationDetailScreen />);

    expect(await screen.findByText("Sold")).toBeTruthy();
    expect(screen.queryByText("Is the car still available?")).toBeNull();
    expect(screen.getByPlaceholderText("Message")).toBeTruthy();
  });

  it("sends a Message on a sold Listing", async () => {
    routeGet({ [`/conversations/${CONVERSATION_ID}`]: () => withListing("sold") });
    state.sendText.mockResolvedValue({ ok: true, message: { id: "server-1" } });
    const screen = renderMobile(<ConversationDetailScreen />);

    await screen.findByText("Sold");
    fireEvent.changeText(screen.getByPlaceholderText("Message"), "Is the price final?");
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Send message" }));
    });
    expect(state.sendText).toHaveBeenCalledWith(expect.objectContaining({ text: "Is the price final?" }));
  });

  it("shows the Removed from sale badge and its banner for an archived Listing", async () => {
    routeGet({ [`/conversations/${CONVERSATION_ID}`]: () => withListing("archived") });
    const screen = renderMobile(<ConversationDetailScreen />);

    expect(await screen.findByText("Removed from sale")).toBeTruthy();
    expect(
      screen.getByText("This car was removed from sale. You can keep talking, but the Listing is no longer available."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "See other Toyota Camry" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send message" })).toBeTruthy();
  });

  it.each([
    ["listing_unavailable", "This Listing is no longer available"],
    ["chat_disabled", "The seller has turned off messages for this Listing"],
    ["participant_unavailable", "You can't send messages in this Conversation"],
  ] as const)("replaces the composer with one line for %s and keeps History readable", async (restriction, line) => {
    routeGet({
      [`/conversations/${CONVERSATION_ID}`]: () =>
        conversation({ listing: restriction === "listing_unavailable" ? null : conversation().listing, sendRestriction: restriction }),
    });
    state.messages.data = { pages: [{ items: [SELLER_MESSAGE] }] };
    const screen = renderMobile(<ConversationDetailScreen />);

    expect(await screen.findByText(line)).toBeTruthy();
    expect(screen.getByText("Thanks, already sold")).toBeTruthy();
    expect(screen.queryByPlaceholderText("Message")).toBeNull();
    expect(screen.queryByRole("button", { name: "Send message" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Attach photo" })).toBeNull();
    expect(screen.queryByText("Is the car still available?")).toBeNull();
    expect(screen.queryByText("typing...")).toBeNull();
    expect(state.sendText).not.toHaveBeenCalled();
  });

  it("does not make the strip tappable when the Listing is no longer available", async () => {
    routeGet({
      [`/conversations/${CONVERSATION_ID}`]: () => conversation({ sendRestriction: "listing_unavailable" }),
    });
    const screen = renderMobile(<ConversationDetailScreen />);

    expect(await screen.findByText("This Listing is no longer available")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Open:/ })).toBeNull();
  });

  it("lets the blocked banner with Unblock win over a closed Listing line", async () => {
    routeGet({
      [`/conversations/${CONVERSATION_ID}`]: () =>
        conversation({ blockedByMe: true, sendRestriction: "blocked_by_me", listing: withListing("sold").listing }),
    });
    const screen = renderMobile(<ConversationDetailScreen />);

    expect(await screen.findByRole("button", { name: "Unblock" })).toBeTruthy();
    expect(screen.getByText("User blocked")).toBeTruthy();
    expect(screen.queryByText("This Listing is no longer available")).toBeNull();
    expect(screen.queryByRole("button", { name: "Send message" })).toBeNull();
  });

  it("reloads the Conversation and updates the footer when a send is refused after the state changed", async () => {
    let restricted = false;
    routeGet({
      [`/conversations/${CONVERSATION_ID}`]: () =>
        conversation({ sendRestriction: restricted ? "chat_disabled" : null }),
    });
    state.sendText.mockImplementation(async () => {
      restricted = true;
      return { ok: false, code: "FORBIDDEN", message: "Forbidden" };
    });
    const screen = renderMobile(<ConversationDetailScreen />);

    await screen.findByText("Merdan");
    fireEvent.changeText(screen.getByPlaceholderText("Message"), "Hello");
    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Send message" }));
    });

    expect(await screen.findByText("The seller has turned off messages for this Listing")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Send message" })).toBeNull();
  });
});
