import { Tabs } from "expo-router";

import { AutoTmTabBar } from "../../components/navigation/AutoTmTabBar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <AutoTmTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Search",
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favorites",
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: "Sell",
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: "Services",
        }}
      />
    </Tabs>
  );
}
