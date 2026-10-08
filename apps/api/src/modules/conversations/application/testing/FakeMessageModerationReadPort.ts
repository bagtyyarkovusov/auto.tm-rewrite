import type { MessageModerationReadPort, ReportedMessage } from "../../domain/ports/MessageModerationReadPort";

export class FakeMessageModerationReadPort implements MessageModerationReadPort {
  messages: Record<string, ReportedMessage> = {};

  async getReportedMessage(id: string): Promise<ReportedMessage | null> {
    return this.messages[id] ?? null;
  }
}
