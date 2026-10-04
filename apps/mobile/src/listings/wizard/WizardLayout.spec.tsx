import { AccessibilityInfo } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, renderMobile } from "../../../test/render";

import { WizardLayout } from "./WizardLayout";

vi.mock("react-native-safe-area-context", async () => ({
  SafeAreaView: (await import("react-native")).View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock("@/components/ui/progress", async () => ({ Progress: (await import("react-native")).View }));

const announcements = (AccessibilityInfo as unknown as { announcements: string[] }).announcements;

type LayoutProps = Partial<React.ComponentProps<typeof WizardLayout>>;

function layout(stepTitle: string, stepNumber: number, overrides: LayoutProps = {}) {
  return (
    <WizardLayout
      routeTitle="Sell car"
      stepTitle={stepTitle}
      stepNumber={stepNumber}
      stepCount={7}
      onBack={() => {}}
      onContinue={() => {}}
      onPublish={() => {}}
      onClose={() => {}}
      mode="create"
      editDetourActive={false}
      canContinue
      canPublish={false}
      canGoBack={stepNumber > 1}
      isLastStep={false}
      saveStatus="idle"
      saveError={null}
      onRetrySave={() => {}}
      progressPercent={(stepNumber / 7) * 100}
      {...overrides}
    >
      {null}
    </WizardLayout>
  );
}

describe("WizardLayout step header", () => {
  beforeEach(() => {
    announcements.length = 0;
  });

  it("shows Step N of 7 and announces the step title with its position when a step opens", () => {
    const screen = renderMobile(layout("Car", 1));

    expect(screen.getByText("Sell car · Step 1 of 7")).toBeTruthy();
    expect(screen.getByRole("header", { name: "Car, Step 1 of 7" })).toBeTruthy();
    expect(announcements).toEqual(["Car, Step 1 of 7"]);

    screen.rerender(layout("Details and condition", 2));

    expect(screen.getByRole("header", { name: "Details and condition, Step 2 of 7" })).toBeTruthy();
    expect(announcements).toEqual(["Car, Step 1 of 7", "Details and condition, Step 2 of 7"]);
  });

  it("reads the step position once, in the heading, not again in the top row", () => {
    const screen = renderMobile(layout("Car", 1));

    expect(screen.getByText("Sell car · Step 1 of 7").props.accessibilityLabel).toBe("Sell car");
    expect(screen.getByRole("header", { name: "Car, Step 1 of 7" })).toBeTruthy();
  });

  it("does not announce again when the same step re-renders", () => {
    const screen = renderMobile(layout("Car", 1));
    screen.rerender(layout("Car", 1));

    expect(announcements).toEqual(["Car, Step 1 of 7"]);
  });
});

describe("WizardLayout close button (#585)", () => {
  it("shows ✕ announced as Close in place of Cancel, and no delete or discard action", () => {
    const screen = renderMobile(layout("Car", 1));

    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
    expect(screen.queryByText("Cancel")).toBeNull();
    expect(screen.queryByText(/discard/i)).toBeNull();
    expect(screen.queryByText(/delete/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /discard|delete/i })).toBeNull();
  });

  it("calls onClose and opens no confirmation of its own", () => {
    const onClose = vi.fn();
    const screen = renderMobile(layout("Car", 1, { onClose }));

    fireEvent.press(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Discard listing?")).toBeNull();
  });

  it("is disabled while the wizard is closing", () => {
    const onClose = vi.fn();
    const screen = renderMobile(layout("Car", 1, { onClose, isClosing: true }));

    fireEvent.press(screen.getByRole("button", { name: "Close" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Close" }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it.each([
    ["ru", "Закрыть"],
    ["tk", "Ýap"],
  ] as const)("is announced as Close in %s", (locale, label) => {
    const screen = renderMobile(layout("Car", 1), { locale });

    expect(screen.getByRole("button", { name: label })).toBeTruthy();
  });

  it("keeps Cancel and the Leave edit mode dialog when editing a published Listing", () => {
    const onDiscard = vi.fn();
    const screen = renderMobile(
      layout("Price", 4, {
        mode: "edit",
        onClose: undefined,
        onDiscard,
        discardTitle: "Leave edit mode?",
        discardDescription: "Any unsaved changes will be lost.",
      }),
    );

    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    fireEvent.press(screen.getByText("Cancel"));
    expect(screen.getByText("Leave edit mode?")).toBeTruthy();
  });
});

describe("WizardLayout save status under the progress bar (#585)", () => {
  beforeEach(() => {
    announcements.length = 0;
  });

  it.each([
    ["en", { saving: "Saving...", saved: "Saved", error: "Not saved. Retry" }],
    ["ru", { saving: "Сохранение...", saved: "Сохранено", error: "Не сохранено. Повторить" }],
    ["tk", { saving: "Ýatda saklanýar...", saved: "Ýatda saklandy", error: "Ýatda saklanmady. Täzeden synanyş" }],
  ] as const)("shows Saving, Saved and Not saved in %s", (locale, text) => {
    const screen = renderMobile(layout("Car", 1, { saveStatus: "saving" }), { locale });
    expect(screen.getByText(text.saving)).toBeTruthy();

    screen.rerender(layout("Car", 1, { saveStatus: "saved" }));
    expect(screen.getByText(text.saved)).toBeTruthy();
    expect(screen.queryByText(text.saving)).toBeNull();

    screen.rerender(layout("Car", 1, { saveStatus: "error", saveError: "No internet" }));
    expect(screen.getByRole("button", { name: text.error })).toBeTruthy();
  });

  it("puts the status line after the progress bar in the header and out of the top row", () => {
    const screen = renderMobile(layout("Car", 1, { saveStatus: "saved" }));

    expect(screen.getByText("Sell car · Step 1 of 7")).toBeTruthy();
    expect(screen.queryByText(/Sell car · Step 1 of 7 ·/)).toBeNull();
    const json = JSON.stringify(screen.toJSON());
    expect(json.indexOf('"Saved"')).toBeGreaterThan(json.indexOf('"Car"'));
  });

  it("shows nothing before the first save", () => {
    const screen = renderMobile(layout("Car", 1, { saveStatus: "idle" }));

    expect(screen.queryByText("Saved")).toBeNull();
    expect(screen.queryByText("Saving...")).toBeNull();
    expect(screen.queryByText("Not saved. Retry")).toBeNull();
  });

  it("Retry saves again", () => {
    const onRetrySave = vi.fn();
    const screen = renderMobile(layout("Car", 1, { saveStatus: "error", onRetrySave }));

    fireEvent.press(screen.getByRole("button", { name: "Not saved. Retry" }));

    expect(onRetrySave).toHaveBeenCalledTimes(1);
  });

  it("is a polite live region and announces each status change once", () => {
    const screen = renderMobile(layout("Car", 1, { saveStatus: "saving" }));
    expect(screen.getByText("Saving...").parent?.props.accessibilityLiveRegion).toBe("polite");

    screen.rerender(layout("Car", 1, { saveStatus: "saving" }));
    screen.rerender(layout("Car", 1, { saveStatus: "saved" }));
    screen.rerender(layout("Car", 1, { saveStatus: "error", saveError: "No internet" }));

    expect(announcements).toEqual([
      "Car, Step 1 of 7",
      "Saving...",
      "Saved",
      "Not saved. Retry",
    ]);
  });
});
