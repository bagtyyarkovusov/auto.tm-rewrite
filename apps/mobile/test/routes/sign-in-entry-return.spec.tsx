import type * as Native from "react-native";
import { beforeEach, afterEach, expect, it, vi } from "vitest";

import EmailScreen from "../../app/(auth)/email";
import PhoneScreen from "../../app/(auth)/phone";
import OtpScreen from "../../app/(auth)/otp";
import { useAuthIntentStore } from "../../src/auth/intentStore";
import { act, fireEvent, renderMobile, routeParams, routerMock } from "../render";

const navigation = vi.hoisted(() => ({ back: () => {} }));
vi.mock("@react-navigation/native", () => ({
  DefaultTheme: { dark: false, colors: {} }, DarkTheme: { dark: true, colors: {} },
  usePreventRemove: (_enabled: boolean, callback: () => void) => { navigation.back = callback; },
}));
vi.mock("react-native", async (importOriginal) => {
  const hosts = await importOriginal<typeof Native>();
  return { ...hosts, Animated: {
    View: hosts.View,
    Value: class { setValue() {} },
    timing: () => ({}), sequence: () => ({ start: () => {} }),
  } };
});

beforeEach(() => {
  vi.stubGlobal("__DEV__", false);
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => { callback(); return 1; });
  useAuthIntentStore.setState({ intent: null, replayAction: null, replayReturnTo: null });
});
afterEach(() => vi.unstubAllGlobals());

function openEmailCode() {
  Object.assign(routeParams, { method: "email", destination: "held@example.com", resendInSeconds: "0" });
  return renderMobile(<OtpScreen />);
}

it("Use phone instead returns to a mounted email entry in place, retaining its held phone value and pending intent", () => {
  useAuthIntentStore.getState().requireSignIn(routerMock, { returnTo: "/(tabs)/favorites" }, "email");
  routeParams.authRoot = "1";
  const entry = renderMobile(<EmailScreen />);
  fireEvent.press(entry.getByText("Phone"));
  fireEvent.changeText(entry.getByLabelText("Phone number"), "61234567");
  fireEvent.press(entry.getByText("Email"));
  fireEvent.changeText(entry.getByPlaceholderText("name@example.com"), "held@example.com");
  const code = openEmailCode();
  fireEvent.press(code.getByRole("button", { name: "Use phone instead" }));
  expect(routerMock.back).toHaveBeenCalledOnce();
  expect(routerMock.dismissTo).not.toHaveBeenCalled();
  expect(entry.getByDisplayValue("61 23-45-67")).toBeTruthy();
  expect(useAuthIntentStore.getState().intent).not.toBeNull();
});

it("Change email returns to the selected method with its typed value and no intent cleanup", () => {
  const entry = renderMobile(<PhoneScreen />);
  fireEvent.press(entry.getByText("Email"));
  fireEvent.changeText(entry.getByPlaceholderText("name@example.com"), "held@example.com");
  const code = openEmailCode();
  fireEvent.press(code.getByRole("button", { name: "Change email" }));
  expect(routerMock.back).toHaveBeenCalledOnce();
  expect(entry.getByDisplayValue("held@example.com")).toBeTruthy();
});


it("Code header Back returns to the held selected method without abandoning intent", () => {
  useAuthIntentStore.getState().requireSignIn(routerMock, { returnTo: "/(tabs)/favorites" });
  routeParams.authRoot = "1";
  const entry = renderMobile(<PhoneScreen />);
  fireEvent.press(entry.getByText("Email"));
  fireEvent.changeText(entry.getByPlaceholderText("name@example.com"), "held@example.com");
  const code = openEmailCode();
  fireEvent.press(code.getByRole("button", { name: /^[Bb]ack$/ }));
  expect(routerMock.back).toHaveBeenCalledOnce();
  expect(routerMock.dismissTo).not.toHaveBeenCalled();
  expect(entry.getByDisplayValue("held@example.com")).toBeTruthy();
  expect(useAuthIntentStore.getState().intent).not.toBeNull();
});

it("the Code native Back guard returns to the same entry and leaves intent live", () => {
  useAuthIntentStore.getState().requireSignIn(routerMock, { returnTo: "/(tabs)/favorites" });
  routeParams.authRoot = "1";
  const entry = renderMobile(<PhoneScreen />);
  fireEvent.press(entry.getByText("Email"));
  fireEvent.changeText(entry.getByPlaceholderText("name@example.com"), "held@example.com");
  openEmailCode();
  act(() => navigation.back());
  expect(routerMock.back).toHaveBeenCalledOnce();
  expect(routerMock.dismissTo).not.toHaveBeenCalled();
  expect(entry.getByDisplayValue("held@example.com")).toBeTruthy();
  expect(useAuthIntentStore.getState().intent).not.toBeNull();
});
