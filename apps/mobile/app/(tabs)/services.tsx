import {
  ChevronRight,
  List,
  Plus,
  Settings,
  User,
} from "lucide-react-native";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../src/auth/useAuth";
import { useAuthIntentStore } from "../../src/auth/intentStore";
import { useMe } from "../../src/api/identity/useMe";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";

function AnonymousIdentityCard() {
  const { t } = useTranslation(["account", "common"]);

  const handleSignIn = () => {
    useAuthIntentStore.getState().setIntent({
      returnPath: "/(tabs)/services",
    });
    router.push("/(auth)/phone");
  };

  return (
    <Card>
      <CardContent className="items-center gap-4 py-8">
        <View className="items-center justify-center rounded-full bg-muted size-20">
          <Icon as={User} className="size-10 text-muted-foreground" />
        </View>
        <View className="items-center gap-1">
          <Text className="text-lg font-semibold text-foreground">
            {t("common:signInToManage")}
          </Text>
          <Text className="text-sm text-muted-foreground text-center">
            {t("common:signInToManageDescription")}
          </Text>
        </View>
        <Button variant="brand" size="pill" onPress={handleSignIn}>
          <Text>{t("common:signIn")}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

function AuthenticatedIdentityCard() {
  const { t } = useTranslation(["account", "common"]);
  const { data, isPending, isError } = useMe({ enabled: true });

  const handlePress = () => {
    router.push("/profile");
  };

  if (isPending) {
    return (
      <Card>
        <CardContent className="items-center gap-3 py-8">
          <ActivityIndicator />
          <Text className="text-sm text-muted-foreground">
            {t("common:loading")}
          </Text>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="items-center gap-2 py-8">
          <Text className="text-sm text-muted-foreground text-center">
            {t("common:somethingWentWrong")}
          </Text>
        </CardContent>
      </Card>
    );
  }

  const avatarInitial = data.displayName
    ? data.displayName.charAt(0).toUpperCase()
    : undefined;

  return (
    <Pressable onPress={handlePress} className="active:opacity-90">
      <Card>
        <CardContent className="flex-row items-center gap-4 py-5">
          <Avatar className="size-16" alt={data.displayName ?? data.phone}>
            {data.avatarUrl ? (
              <AvatarImage source={{ uri: data.avatarUrl }} />
            ) : null}
            <AvatarFallback>
              {avatarInitial ? (
                <Text className="text-2xl font-heading text-foreground">
                  {avatarInitial}
                </Text>
              ) : (
                <Icon as={User} className="size-8 text-muted-foreground" />
              )}
            </AvatarFallback>
          </Avatar>

          <View className="flex-1">
            <Text className="text-lg font-semibold text-foreground">
              {data.displayName ?? data.phone}
            </Text>
            {data.displayName ? (
              <Text className="text-sm text-muted-foreground">
                {data.phone}
              </Text>
            ) : null}
          </View>

          <Icon as={ChevronRight} className="size-5 text-muted-foreground" />
        </CardContent>
      </Card>
    </Pressable>
  );
}

function MyListingsRow() {
  const { t } = useTranslation(["account", "common"]);

  return (
    <Pressable
      onPress={() => router.push("/listings/manage")}
      className="active:opacity-90"
      accessibilityRole="button"
      accessibilityLabel={t("common:myListingsAndDrafts")}
    >
      <Card>
        <CardContent className="flex-row items-center gap-3 py-4">
          <Icon as={List} className="size-6 text-foreground" />
          <View className="flex-1">
            <Text className="font-semibold text-foreground">
              {t("common:myListingsAndDrafts")}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {t("common:manageYourListings")}
            </Text>
          </View>
          <Icon as={ChevronRight} className="size-5 text-muted-foreground" />
        </CardContent>
      </Card>
    </Pressable>
  );
}

export default function CabinetScreen() {
  const { t } = useTranslation(["account", "common"]);
  const { isAuthenticated } = useAuth();

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View className="px-4 pt-6 pb-3 flex-row items-center justify-between">
        <Text className="text-2xl font-heading text-foreground">
          {t("common:cabinet")}
        </Text>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onPress={() => router.push("/settings")}
          accessibilityLabel={t("account:settings")}
        >
          <Icon as={Settings} className="size-6 text-foreground" />
        </Button>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-4 pb-6">
        {isAuthenticated === null ? (
          <View className="items-center justify-center py-12">
            <ActivityIndicator />
          </View>
        ) : (
          <>
            {isAuthenticated ? (
              <AuthenticatedIdentityCard />
            ) : (
              <AnonymousIdentityCard />
            )}

            <MyListingsRow />

            <Separator className="bg-border" />

            <Button
              variant="brand"
              size="pill"
              onPress={() => router.push("/(tabs)/sell")}
              accessibilityLabel={t("common:listACar")}
            >
              <Icon as={Plus} className="size-5 text-primary-foreground mr-2" />
              <Text>{t("common:listACar")}</Text>
            </Button>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
