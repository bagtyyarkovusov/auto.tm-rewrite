import type * as Native from "react-native";
import { Alert } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Linking from "expo-linking";
import { Enums } from "@auto-tm/contracts";

import { renderMobile, fireEvent, routerMock, act } from "../../../test/render";

import { ContactCtaBar } from "./ContactCtaBar";

const state = vi.hoisted(() => ({
  authenticated: true as boolean | null,
  pending: false,
  error: null as Error | null,
  mutate: vi.fn(),
  requireSignIn: vi.fn(),
  replay: undefined as (() => void) | undefined,
}));
vi.mock("../../auth/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: state.authenticated }),
}));
vi.mock("../../auth/intentStore", () => ({
  useAuthIntentStore: {
    getState: () => ({ requireSignIn: state.requireSignIn }),
  },
  useReplayAuthAction: (_kind: string, _id: string, action: () => void) => {
    state.replay = action;
  },
}));
vi.mock("../../api/conversations/useOpenConversation", () => ({
  useOpenConversation: () => ({
    mutate: state.mutate,
    isPending: state.pending,
    error: state.error,
  }),
}));
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));
vi.mock("expo-linking", () => ({
  canOpenURL: vi.fn(async () => true),
  openURL: vi.fn(async () => {}),
}));

const props = {
  listingId: "listing-373",
  contactPhone: "+99361000001",
  allowCalls: true,
  allowChat: true,
  status: Enums.ListingStatus.Active,
};
beforeEach(() => {
  state.authenticated = true;
  state.pending = false;
  state.error = null;
  state.mutate.mockReset();
  state.requireSignIn.mockReset();
  vi.mocked(Linking.openURL).mockClear();
});

describe("ContactCtaBar", () => {
  it("opens the seller phone directly for an anonymous buyer", async () => {
    state.authenticated = false;
    const screen = renderMobile(<ContactCtaBar {...props} />);
    await act(async () =>
      fireEvent.press(screen.getByRole("button", { name: "Call" })),
    );
    expect(Linking.openURL).toHaveBeenCalledWith("tel:+99361000001");
    expect(state.requireSignIn).not.toHaveBeenCalled();
  });
  it.each([Enums.ListingStatus.Sold, Enums.ListingStatus.Archived])(
    "disables contact for %s listings",
    (status) => {
      const screen = renderMobile(<ContactCtaBar {...props} status={status} />);
      expect(
        screen.getByRole("button", { name: "Message" }).props.accessibilityState
          .disabled,
      ).toBe(true);
      fireEvent.press(screen.getByRole("button", { name: "Message" }));
      expect(state.mutate).not.toHaveBeenCalled();
      expect(
        screen.queryByText("AutoTM verifies sellers' numbers by SMS."),
      ).toBeNull();
    },
  );
  it("disables Message when chat is unavailable or a request is pending", () => {
    const screen = renderMobile(<ContactCtaBar {...props} allowChat={false} />);
    expect(
      screen.getByRole("button", { name: "Message" }).props.accessibilityState
        .disabled,
    ).toBe(true);
    state.pending = true;
    screen.rerender(<ContactCtaBar {...props} />);
    expect(
      screen.getByRole("button", { name: "Message" }).props.accessibilityState
        .disabled,
    ).toBe(true);
  });
  it("parks the listing Message intent for an anonymous buyer", () => {
    state.authenticated = false;
    const screen = renderMobile(<ContactCtaBar {...props} />);
    fireEvent.press(screen.getByRole("button", { name: "Message" }));
    expect(state.requireSignIn).toHaveBeenCalledWith(routerMock, {
      returnTo: "/(public)/listings/listing-373",
      action: { kind: "message", listingId: "listing-373" },
    });
    expect(state.mutate).not.toHaveBeenCalled();
  });
  it("opens the same conversation from a signed-in tap and post-sign-in replay", () => {
    const screen = renderMobile(<ContactCtaBar {...props} />);
    fireEvent.press(screen.getByRole("button", { name: "Message" }));
    expect(state.mutate).toHaveBeenCalledWith(
      { listingId: "listing-373" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    state.authenticated = false;
    screen.rerender(<ContactCtaBar {...props} />);
    state.replay?.();
    expect(state.mutate).toHaveBeenCalledTimes(2);
  });
  it("does not silently open a conversation before the session check finishes", () => {
    state.authenticated = null;
    const screen = renderMobile(<ContactCtaBar {...props} />);
    fireEvent.press(screen.getByRole("button", { name: "Message" }));
    expect(state.mutate).not.toHaveBeenCalled();
    expect(state.requireSignIn).not.toHaveBeenCalled();
  });
});

vi.mock("react-native", async (original) => ({
  ...await original<typeof Native>(),
  Alert: { alert: vi.fn() },
}));

describe("Android dialer", () => {
  it("dials despite a false package-visibility check", async () => {
    vi.mocked(Linking.canOpenURL).mockResolvedValueOnce(false);
    const view = renderMobile(<ContactCtaBar {...props} />);
    await act(async () => { fireEvent.press(view.getByRole("button", { name: "Call" })); });
    expect(Linking.openURL).toHaveBeenCalledWith("tel:+99361000001");
  });
  it("shows the number when the dialer fails", async () => {
    vi.mocked(Linking.openURL).mockRejectedValueOnce(new Error("No dialer"));
    const view = renderMobile(<ContactCtaBar {...props} />);
    await act(async () => { fireEvent.press(view.getByRole("button", { name: "Call" })); });
    expect(Alert.alert).toHaveBeenCalledWith("Call", "Could not open the dialer. Call +99361000001 manually.");
  });
});
