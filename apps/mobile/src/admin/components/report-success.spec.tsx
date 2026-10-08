import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, renderMobile, within } from "../../../test/render";

import { MessageReportSheet } from "./MessageReportSheet";
import { ReportSheet } from "./ReportSheet";

const reports = vi.hoisted(() => ({
  mutate: vi.fn((_payload: unknown, options: { onSuccess: () => void }) => {
    options.onSuccess();
  }),
  reset: vi.fn(),
  isPending: false,
  isError: false,
}));

vi.mock("../../auth/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));
vi.mock("../../api/admin/useCreateReport", () => ({
  useCreateReport: () => reports,
}));
vi.mock("../../api/admin/useCreateMessageReport", () => ({
  useCreateMessageReport: () => reports,
}));

beforeEach(() => {
  reports.mutate.mockClear();
  reports.reset.mockClear();
});

describe.each(["en", "ru", "tk"])("report success in %s", (locale) => {
  it.each(["listing", "user", "message"] as const)(
    "shows one confirmation after a %s report and keeps Done",
    (targetType) => {
      const onOpenChange = vi.fn();
      const onReported = vi.fn();
      const view = renderMobile(
        targetType === "message" ? (
          <MessageReportSheet
            conversationId="conversation-1"
            messageId="message-1"
            open
            onOpenChange={onOpenChange}
            onReported={onReported}
          />
        ) : (
          <ReportSheet
            targetType={targetType}
            targetId="target-1"
            open
            onOpenChange={onOpenChange}
          />
        ),
        { locale },
      );
      const copy = (key: string) => view.i18n.t(key);

      expect(view.queryByText(copy("thanksWeReceived"))).toBeNull();
      fireEvent.press(view.getByRole("radio", { name: copy("spam") }));
      fireEvent.press(view.getByRole("button", { name: copy("submitReport") }));

      expect(reports.mutate).toHaveBeenCalledTimes(1);
      expect(reports.mutate).toHaveBeenCalledWith(
        targetType === "message"
          ? { conversationId: "conversation-1", messageId: "message-1", reason: "spam" }
          : { targetType, targetId: "target-1", reason: "spam" },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
      expect(view.getAllByText(copy("thanksWeReceived"))).toHaveLength(1);
      expect(view.getByText(copy("report"))).toBeTruthy();
      expect(view.queryByText(copy("selectReason"))).toBeNull();
      expect(view.queryByRole("button", { name: copy("submitReport") })).toBeNull();
      if (targetType === "message") {
        expect(onReported).toHaveBeenCalledTimes(1);
        expect(onReported).toHaveBeenCalledWith("message-1");
      }
      fireEvent.press(view.getByRole("button", { name: copy("done") }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    },
  );
});

// Load the real sheet composition. The native dialog/portal boundary has no
// Node runtime; its hosts keep content and props without emulating layout.
vi.mock("@/components/ui/sheet", async (importOriginal) => await importOriginal());
vi.mock("@rn-primitives/dialog", async () => {
  const { View, Text, Pressable } = await import("react-native");
  return { Root: View, Portal: View, Overlay: View, Content: View, Trigger: Pressable, Close: Pressable, Title: Text, Description: Text };
});
vi.mock("react-native-screens", async () => ({ FullWindowOverlay: (await import("react-native")).View }));

describe.each(["android", "ios"] as const)("report keyboard layout on %s", (os) => {
  it.each(["user", "message"] as const)("keeps %s details scrollable and Submit in the avoidance region", (targetType) => {
    const previousOS = Platform.OS;
    Platform.OS = os;
    try {
      const view = renderMobile(targetType === "message" ?
        <MessageReportSheet conversationId="conversation-1" messageId="message-1" open onOpenChange={vi.fn()} /> :
        <ReportSheet targetType="user" targetId="target-1" open onOpenChange={vi.fn()} />);
      fireEvent.press(view.getByRole("radio", { name: "Other" }));
      fireEvent.changeText(view.getByPlaceholderText("Describe the issue..."), "Report while typing");
      const avoidance = view.UNSAFE_getByType(KeyboardAvoidingView);
      expect(avoidance.props.behavior).toBe("padding");
      expect(within(avoidance).getByDisplayValue("Report while typing")).toBeTruthy();
      expect(within(avoidance).getByRole("button", { name: "Submit report", disabled: false })).toBeTruthy();
      const scroll = view.UNSAFE_getByType(ScrollView);
      expect(scroll.props.keyboardShouldPersistTaps).toBe("handled");
      expect(within(scroll).getByDisplayValue("Report while typing")).toBeTruthy();
      expect(within(scroll).queryByRole("button", { name: "Submit report" })).toBeNull();
      fireEvent.press(view.getByRole("button", { name: "Submit report" }));
      expect(view.getByText("Thanks, we received your report.")).toBeTruthy();
    } finally { Platform.OS = previousOS; }
  });
});
