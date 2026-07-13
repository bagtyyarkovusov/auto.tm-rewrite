import { useMemo } from "react";
import { View } from "react-native";
import { ChevronLeft, User } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { useSafeBack } from "../src/navigation/useSafeBack";
import { useMe } from "../src/api/identity/useMe";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { SafeScreen } from "@/components/navigation/SafeScreen";
import { ErrorState } from "@/components/ErrorState";

function LoadingState() {
  return (
    <View className="flex-1 px-4 pt-4 gap-4">
      <View className="items-center gap-3 py-6">
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="h-6 w-48 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
      </View>
      <Skeleton className="h-24 w-full rounded-xl" />
    </View>
  );
}

function formatMemberSince(isoDate: string, locale: string): string {
  const d = new Date(isoDate);
  const localeTag = locale === "tk" ? "tk-TM" : locale === "en" ? "en-US" : "ru-RU";
  try {
    return d.toLocaleDateString(localeTag, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return d.toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

export default function ProfileScreen() {
  const { t, i18n } = useTranslation(["account", "common"]);
  const { data, isPending, isError, error, refetch } = useMe();
  const goBack = useSafeBack("/(tabs)/services");

  const roleLabel = useMemo(() => {
    if (!data) return "";
    const map: Record<string, string> = {
      buyer: t("account:roleBuyer"),
      seller: t("account:roleSeller"),
      moderator: t("account:roleModerator"),
      admin: t("account:roleAdmin"),
    };
    return map[data.role] ?? data.role;
  }, [data, t]);

  // Only a real name yields a meaningful initial — the first character of a
  // phone number is "+", which reads as an add-photo affordance.
  const avatarInitial = useMemo(() => {
    if (data?.displayName) return data.displayName.charAt(0).toUpperCase();
    return undefined;
  }, [data]);

  return (
    <SafeScreen>
      {/* Header */}
      <View className="px-4 pb-3 flex-row items-center gap-2">
        <Button variant="ghost" size="icon" className="h-11 w-11" onPress={goBack}>
          <Icon as={ChevronLeft} className="size-6 text-foreground" />
        </Button>
        <Text className="text-2xl font-heading text-foreground">
          {t("account:profile")}
        </Text>
      </View>

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data ? (
        <View className="flex-1 px-4 pt-4 gap-4">
          {/* Identity card */}
          <View className="items-center gap-3 py-6">
            <Avatar className="size-24" alt={data.displayName ?? data.phone}>
              {data.avatarUrl ? (
                <AvatarImage source={{ uri: data.avatarUrl }} />
              ) : null}
              <AvatarFallback>
                {avatarInitial ? (
                  <Text className="text-3xl font-heading text-foreground">
                    {avatarInitial}
                  </Text>
                ) : (
                  <Icon as={User} className="size-10 text-muted-foreground" />
                )}
              </AvatarFallback>
            </Avatar>

            <Text className="text-xl font-heading text-foreground">
              {data.displayName ?? data.phone}
            </Text>

            <Badge variant="secondary">
              <Text>{roleLabel}</Text>
            </Badge>
          </View>

          <Card>
            <CardContent className="gap-1">
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-sm text-muted-foreground">
                  {t("account:phone")}
                </Text>
                <Text className="text-base text-foreground font-medium">
                  {data.phone}
                </Text>
              </View>
              <Separator />
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-sm text-muted-foreground">
                  {t("account:memberSince")}
                </Text>
                <Text className="text-base text-foreground font-medium">
                  {formatMemberSince(data.createdAt, i18n.language)}
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>
      ) : null}
    </SafeScreen>
  );
}
