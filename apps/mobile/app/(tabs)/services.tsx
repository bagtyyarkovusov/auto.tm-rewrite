import {
  FileText,
  Info,
  Settings,
  User,
  Wrench,
} from "lucide-react-native";
import { ScrollView, View } from "react-native";
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
