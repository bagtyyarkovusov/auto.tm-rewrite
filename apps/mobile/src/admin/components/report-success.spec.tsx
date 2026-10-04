import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, renderMobile } from "../../../test/render";

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
