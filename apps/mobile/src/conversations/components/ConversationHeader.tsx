import { useState } from "react";
import { View } from "react-native";
import { BellOff, MoreHorizontal, Phone } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { openSellerDialer } from "../../listings/openSellerDialer";
import type { ConversationDetail } from "../../api/conversations/useConversation";
import { usePeerName } from "../usePeerName";

import { ConversationMenuSheet } from "./ConversationMenuSheet";
import { PeerPresenceLabel, type PeerPresence } from "./PeerPresenceLabel";

import { PublicUserAvatar } from "@/components/identity/PublicUserAvatar";
import { BackButton, HeaderButton, StackHeader } from "@/components/navigation/StackHeader";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

interface ConversationHeaderProps {
  /** Undefined until the Conversation arrives, or when it failed to load. */
  conversation: ConversationDetail | undefined;
  /** Skeletons stand in for the participant while true. */
  loading: boolean;
  presence: PeerPresence;
  /** The Listing contact phone; Call is shown only when present. */
  callPhone?: string;
  isMuted: boolean;
  isBlocked: boolean;
  muteDisabled?: boolean;
  /** Reports the header's measured height, which grows with the text size. */
  onHeightChange?: (height: number) => void;
  onBack: () => void;
  onToggleMute: () => void;
  /** Omitted when reporting is switched off; the menu then has no Report. */
  onReport?: () => void;
  onBlock: () => void;
  onUnblock: () => void;
}

export function ConversationHeader({
  conversation,
  loading,
  presence,
  callPhone,
  isMuted,
  isBlocked,
  muteDisabled = false,
  onHeightChange,
  onBack,
  onToggleMute,
  onReport,
  onBlock,
  onUnblock,
}: ConversationHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const { t: tConv } = useTranslation("conversations");
  const peerName = usePeerName(conversation);

  const handleCall = async () => {
    if (!callPhone) return;
    await openSellerDialer(callPhone, t);
  };

  return (
    <StackHeader
      onLayout={(event) => onHeightChange?.(event.nativeEvent.layout.height)}
      className="bg-background pt-2"
      leading={<BackButton onPress={onBack} accessibilityLabel={t("goBack")} />}
      trailing={
        <View className="flex-row items-center gap-2">
          {callPhone && (
            <HeaderButton
              icon={Phone}
              onPress={handleCall}
              accessibilityLabel={tConv("callSeller")}
            />
          )}

          {conversation && (
            <HeaderButton
              icon={MoreHorizontal}
              onPress={() => setMenuOpen(true)}
              accessibilityLabel={tConv("conversationMenu")}
            />
          )}

          <ConversationMenuSheet
            open={menuOpen}
            onOpenChange={setMenuOpen}
            isMuted={isMuted}
            isBlocked={isBlocked}
            muteDisabled={muteDisabled}
            onToggleMute={onToggleMute}
            onReport={onReport}
            onBlock={onBlock}
            onUnblock={onUnblock}
          />
        </View>
      }
    >
      {conversation && peerName ? (
        <>
          <PublicUserAvatar size={36} user={conversation.peer} />
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1.5">
              <Text
                className="shrink text-body font-semibold text-foreground"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {peerName}
              </Text>
              {isMuted && (
                <View accessible accessibilityLabel={t("conversationMuted")}>
                  <Icon as={BellOff} className="size-4 text-muted-foreground" />
                </View>
              )}
            </View>
            <PeerPresenceLabel presence={presence} locale={i18n.language} />
          </View>
        </>
      ) : loading ? (
        <View className="flex-1 flex-row items-center gap-2" testID="conversation-header-skeleton">
          <Skeleton className="h-9 w-9 rounded-full" />
          <View className="flex-1 gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </View>
        </View>
      ) : (
        <View className="flex-1" />
      )}
    </StackHeader>
  );
}
