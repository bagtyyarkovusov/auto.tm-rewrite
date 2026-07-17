import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { localeTag } from "../../i18n/resources";

import { Text } from "@/components/ui/text";

export interface PeerPresence {
  userId?: string;
  online: boolean;
  lastSeenAt?: string;
}

interface PeerPresenceLabelProps {
  presence: PeerPresence;
  locale: string;
}

export function PeerPresenceLabel({ presence, locale }: PeerPresenceLabelProps) {
  const { t } = useTranslation("conversations");

  const label = useMemo(() => {
    if (presence.online) {
      return t("online");
    }

    if (!presence.lastSeenAt) {
      return null;
    }

    const lastSeen = new Date(presence.lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / 60_000);

    if (diffMinutes < 1) {
      return t("lastSeenJustNow");
    }

    if (diffMinutes < 60) {
      return t("lastSeenMinutes", { count: diffMinutes });
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return t("lastSeenHours", { count: diffHours });
    }

    if (isYesterday(lastSeen, now)) {
      return t("lastSeenYesterday");
    }

    const dateLabel = lastSeen.toLocaleDateString(localeTag(locale), {
      month: "short",
      day: "numeric",
    });

    return t("lastSeenDate", { date: dateLabel });
  }, [presence, locale, t]);

  if (!label) {
    return null;
  }

  return (
    <Text className="text-xs text-muted-foreground" numberOfLines={1}>
      {label}
    </Text>
  );
}

function isYesterday(date: Date, now: Date): boolean {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}
