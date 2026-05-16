import { router } from "expo-router";
import { FlaskConical, Search } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRequestOtp } from "../../src/api/identity/useRequestOtp";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

const E2E_TEST_PHONE = "+99361234567";

function isDevBuild(): boolean {
  return process.env.EXPO_PUBLIC_ENV !== "production";
}

export default function FeedScreen() {
  const [e2eLoading, setE2eLoading] = useState(false);
  const { mutateAsync: requestOtp } = useRequestOtp();

  async function runE2EOtpFlow() {
    setE2eLoading(true);
    try {
      const result = await requestOtp({ phone: E2E_TEST_PHONE });
      router.push({
        pathname: "/(auth)/otp",
        params: {
          phone: E2E_TEST_PHONE,
          requestId: result.requestId,
          resendInSeconds: String(result.resendInSeconds),
          ...(result.testCode ? { testCode: result.testCode } : {}),
        },
      });
    } catch {
      // silently fail — the API may not be running
    } finally {
      setE2eLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-6 pb-3">
        <Text className="text-2xl font-semibold text-foreground">Search</Text>
      </View>
      <View className="px-4">
        <View className="flex-row items-center gap-2 rounded-md border border-input bg-background px-3 shadow-sm shadow-black/5">
          <Icon as={Search} className="size-4 text-muted-foreground" />
          <Input
            className="flex-1 border-0 bg-transparent px-0 shadow-none"
            placeholder="Make, model, or keyword..."
          />
        </View>
      </View>
      <View className="flex-1 items-center justify-center px-4">
        <Icon as={Search} className="size-8 text-muted-foreground" />
        <Text className="mt-3 text-base text-muted-foreground">
          No listings yet
        </Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          Start browsing or sell your first car
        </Text>
        <Button
          className="mt-6"
          size="lg"
          variant="default"
          onPress={() => router.push("/(auth)/phone")}
        >
          <Text>Sign In</Text>
        </Button>

        {isDevBuild() ? (
          <View className="mt-4 items-center gap-2">
            <View className="h-px w-32 bg-border" />
            <Text className="text-xs text-muted-foreground">
              E2E test helper
            </Text>
            <Button
              disabled={e2eLoading}
              size="sm"
              variant="outline"
              onPress={runE2EOtpFlow}
            >
              {e2eLoading ? (
                <ActivityIndicator className="text-muted-foreground" />
              ) : (
                <Icon as={FlaskConical} className="size-4 text-muted-foreground" />
              )}
              <Text>Run OTP flow</Text>
            </Button>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
