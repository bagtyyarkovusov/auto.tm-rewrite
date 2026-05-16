import { Tabs } from "expo-router";
import {
  Heart,
  LayoutGrid,
  MessageSquare,
  PlusCircle,
  Search,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";

import { THEME } from "../../lib/theme";

import { Icon } from "@/components/ui/icon";


export default function TabLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = THEME[isDark ? "dark" : "light"];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: `hsl(${colors.primary})`,
        tabBarInactiveTintColor: `hsl(${colors.mutedForeground})`,
        tabBarStyle: {
          backgroundColor: `hsl(${colors.background})`,
          borderTopColor: `hsl(${colors.border})`,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" as const, marginBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Search",
          tabBarIcon: ({ focused, size }) => (
            <Icon
              as={Search}
              className={focused ? "text-primary" : "text-muted-foreground"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favorites",
          tabBarIcon: ({ focused, size }) => (
            <Icon
              as={Heart}
              className={focused ? "text-primary" : "text-muted-foreground"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: "",
          tabBarIcon: ({ focused, size }) => (
            <Icon
              as={PlusCircle}
              className={focused ? "text-primary" : "text-muted-foreground"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ focused, size }) => (
            <Icon
              as={MessageSquare}
              className={focused ? "text-primary" : "text-muted-foreground"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: "Services",
          tabBarIcon: ({ focused, size }) => (
            <Icon
              as={LayoutGrid}
              className={focused ? "text-primary" : "text-muted-foreground"}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
