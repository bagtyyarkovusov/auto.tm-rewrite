import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function FeedScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-white dark:bg-neutral-950 px-4">
      <Text className="text-2xl font-bold text-[#E60000]">AutoTM</Text>
      <Text className="text-neutral-500">Feed (placeholder)</Text>
      <Pressable
        className="h-11 items-center justify-center rounded-md bg-brand-500 px-6"
        onPress={() => router.push("/(auth)/phone")}
      >
        <Text className="text-base font-medium text-neutral-0">Sign In</Text>
      </Pressable>
    </View>
  );
}
