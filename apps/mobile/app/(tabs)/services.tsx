import {
  Bell,
  CircleHelp,
  FileText,
  Info,
  ScrollText,
  ShieldCheck,
  User,
} from "lucide-react-native";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { maskEmail } from "../../src/auth/email";
import { maskTmPhone } from "../../src/auth/phone";
import { useAuth } from "../../src/auth/useAuth";
import { useAuthIntentStore } from "../../src/auth/intentStore";
import { useMe } from "../../src/api/identity/useMe";
import { useDisplayName } from "../../src/identity/useDisplayName";
import { legalPageUrl } from "../../src/config/publicWebUrl";

import { LanguageRow } from "@/components/account/LanguageRow";
import { MenuDivider, MenuGap, MenuRow } from "@/components/account/MenuRow";
import { MyListingsRow } from "@/components/account/MyListingsRow";
import { ThemeRow } from "@/components/account/ThemeRow";
import { UserAvatar } from "@/components/identity/UserAvatar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

/** The neutral person icon: nobody is signed in, or `/me` failed. Never a car. */
function PersonAvatar() {
  return (
    <Avatar className="size-12" alt="">
      <AvatarFallback>
        <Icon as={User} className="size-6 text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
  );
}

function SignInRow() {
  const { t } = useTranslation(["account", "common"]);

  return (
    <MenuRow
      size="large"
      lead={<PersonAvatar />}
      label={t("common:signIn")}
      sub={t("account:signInSub")}
      chevron
      onPress={() =>
        useAuthIntentStore.getState().requireSignIn(router, {
          returnTo: "/(tabs)/services",
        })
      }
    />
  );
}

function ProfileRowSkeleton() {
  const { t } = useTranslation("common");

  return (
    <View
      accessible
      accessibilityLabel={t("loading")}
      className="min-h-[76px] flex-row items-center gap-3.5 px-4 py-2"
    >
      <Skeleton className="size-12 rounded-full" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-4 w-40 rounded" />
        <Skeleton className="h-3 w-28 rounded" />
      </View>
    </View>
  );
}

/**
 * The large profile row. The only row that waits for `/me`. Every signed-in
 * User has a name, set or generated, and the masked Sign-in Method under it.
 */
function ProfileRow() {
  const { t } = useTranslation("common");
  const displayNameOf = useDisplayName();
  const { data, isPending, isError, refetch } = useMe({ enabled: true });

  if (isPending) return <ProfileRowSkeleton />;

  if (isError || !data) {
    return (
      <View
        accessibilityRole="alert"
        className="min-h-[76px] flex-row items-center gap-3.5 px-4 py-2"
      >
        <PersonAvatar />
        <Text className="flex-1 text-base text-muted-foreground">
          {t("somethingWentWrong")}
        </Text>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11"
          onPress={() => void refetch()}
          accessibilityLabel={t("retry")}
        >
          <Text>{t("retry")}</Text>
        </Button>
      </View>
    );
  }

  // Sign-in Methods are masked as on Profile.
  const method = data.phone
    ? maskTmPhone(data.phone)
    : data.email
      ? maskEmail(data.email)
      : "";

  return (
    <MenuRow
      size="large"
      singleLineLabel
      // The row's label names the User, so the avatar carries no label of its own.
      lead={
        <UserAvatar
          size={48}
          avatarIndex={data.avatarIndex}
          avatarKey={data.avatarKey}
          avatarUrl={data.avatarUrl}
        />
      }
      label={displayNameOf(data)}
      sub={method}
      chevron
      onPress={() => router.push("/profile")}
    />
  );
}

function openLegalPage(locale: string, kind: "terms" | "privacy" | "posting-rules") {
  void Linking.openURL(legalPageUrl(locale, kind));
}

export default function CabinetScreen() {
  const { t, i18n } = useTranslation(["account", "common", "support"]);
  const { isAuthenticated } = useAuth();

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "left", "right"]}
    >
      <View className="px-4 pt-6 pb-3">
        <Text className="text-2xl font-heading text-foreground">
          {t("common:cabinet")}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-6">
        {isAuthenticated === null ? (
          <ProfileRowSkeleton />
        ) : isAuthenticated ? (
          <ProfileRow />
        ) : (
          <SignInRow />
        )}

        {isAuthenticated ? (
          <>
            <MenuGap />
            <MenuRow
              icon={Bell}
              label={t("account:notifications")}
              chevron
              onPress={() => router.push("/notifications")}
            />
            <MenuDivider />
            <MyListingsRow />
          </>
        ) : null}

        <MenuGap />
        <LanguageRow />
        <MenuDivider />
        <ThemeRow />
        <MenuDivider />
        <MenuRow
          icon={CircleHelp}
          label={t("support:help")}
          onPress={() => router.push("/help")}
        />
        <MenuDivider />
        <MenuRow
          icon={ShieldCheck}
          label={t("account:termsOfService")}
          onPress={() => openLegalPage(i18n.language, "terms")}
        />
        <MenuDivider />
        <MenuRow
          icon={FileText}
          label={t("account:privacyPolicy")}
          onPress={() => openLegalPage(i18n.language, "privacy")}
        />
        <MenuDivider />
        <MenuRow
          icon={ScrollText}
          label={t("account:postingRules")}
          onPress={() => openLegalPage(i18n.language, "posting-rules")}
        />
        <MenuDivider />
        <MenuRow
          icon={Info}
          label={t("support:about")}
          onPress={() => router.push("/about")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
