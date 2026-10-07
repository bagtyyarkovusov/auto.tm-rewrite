import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../src/api/client";

import { CodeEntryForm } from "./CodeEntryForm";

import { act, fireEvent, renderMobile } from "@/test/render";

// Only native boundaries are substituted: the real form and OtpCells execute.
const native = vi.hoisted(() => ({
  reducedMotion: false,
  focus: vi.fn(),
  animate: vi.fn(),
}));
vi.mock("react-native-reanimated", () => ({
  useReducedMotion: () => native.reducedMotion,
}));
vi.mock("react-native", async (importOriginal) => {
  const hosts = await importOriginal<typeof import("react-native")>();
  const React = await import("react");
  const NativeInput = React.forwardRef<
    { focus: () => void },
    ComponentProps<typeof hosts.TextInput>
  >((props, ref) => {
    React.useImperativeHandle(ref, () => ({ focus: native.focus }), []);
    return <hosts.TextInput {...props} />;
  });
  NativeInput.displayName = "NativeInput";
  return {
    ...hosts,
    TextInput: NativeInput,
    Animated: {
      View: hosts.View,
      Value: class {
        setValue() {}
      },
      timing: () => ({}),
      sequence: () => ({ start: native.animate }),
    },
  };
});

beforeEach(() => {
  native.reducedMotion = false;
  native.focus.mockClear();
  native.animate.mockClear();
  vi.stubGlobal("__DEV__", false);
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
    callback();
    return 1;
  });
});
afterEach(() => vi.unstubAllGlobals());

function renderWrongCode(locale: "en" | "ru" | "tk" = "en") {
  const verify = vi.fn(async () => {
    throw new ApiError("INVALID_OTP", 400, "Invalid code");
  });
  const view = renderMobile(
    <CodeEntryForm
      method="phone"
      displayedDestination="+993 61 ** ** 67"
      initialResendSeconds={0}
      verify={verify}
      resend={async () => ({ resendInSeconds: 120 })}
      onChangeDestination={() => {}}
      onContactSupport={() => {}}
    />,
    { locale },
  );
  // The form also focuses on mount; measure the wrong-code focus reset only.
  native.focus.mockClear();
  return { view, verify };
}

async function enterWrongCode(view: ReturnType<typeof renderMobile>) {
  await act(async () => {
    fireEvent.changeText(view.getByDisplayValue(""), "123456");
  });
}

describe("wrong code through the real form and cells", () => {
  it("uses instant error, digit clearing and focus reset when Reduce Motion is on", async () => {
    native.reducedMotion = true;
    const { view, verify } = renderWrongCode();
    await enterWrongCode(view);
    expect(verify).toHaveBeenCalledWith("123456");
    expect(view.getByText("Wrong code. Try again.")).toBeTruthy();
    expect(view.getByDisplayValue("").props.editable).toBe(true);
    expect(native.focus).toHaveBeenCalledOnce();
    expect(native.animate).not.toHaveBeenCalled();
  });

  it("keeps the normal shake, digit clearing and focus reset when Reduce Motion is off", async () => {
    const { view } = renderWrongCode();
    await enterWrongCode(view);
    expect(view.getByText("Wrong code. Try again.")).toBeTruthy();
    expect(view.getByDisplayValue("").props.editable).toBe(true);
    expect(native.focus).toHaveBeenCalledOnce();
    expect(native.animate).toHaveBeenCalledOnce();
  });
});
