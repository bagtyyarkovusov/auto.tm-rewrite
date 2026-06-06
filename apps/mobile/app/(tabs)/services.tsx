import {
  FileText,
  Info,
  List,
  Settings,
  User,
  Wrench,
} from "lucide-react-native";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const serviceItems = [
  { icon: User, label: "Profile" },
  { icon: Wrench, label: "Garage" },
  { icon: Settings, label: "Settings" },
  { icon: FileText, label: "Blog" },
  { icon: Info, label: "About" },
] as const;

export default function ServicesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-6 pb-3">
        <Text className="text-2xl font-semibold text-foreground">
          Services
        </Text>
      </View>
      <ScrollView className="px-4">
        <Pressable
          onPress={() => router.push("/listings/manage")}
          className="mb-3 active:opacity-90"
          accessibilityRole="button"
          accessibilityLabel="My listings and drafts"
        >
          <Card className="w-full">
            <CardContent className="flex-row items-center gap-3 py-4">
              <Icon as={List} className="size-6 text-foreground" />
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  My listings & drafts
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Manage your active, sold, archived, and draft listings
                </Text>
              </View>
            </CardContent>
          </Card>
        </Pressable>

        <View className="flex-row flex-wrap gap-3">
          {serviceItems.map((item) => (
            <Card key={item.label} className="w-[calc(50%-6px)]">
              <CardContent className="items-center gap-2 py-6">
                <Icon as={item.icon} className="size-8 text-foreground" />
                <Text>{item.label}</Text>
              </CardContent>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
