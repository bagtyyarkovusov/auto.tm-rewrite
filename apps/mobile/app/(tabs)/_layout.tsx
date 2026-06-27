import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

import { AutoTmTabBar } from "../../components/navigation/AutoTmTabBar";

export default function TabLayout() {
  const { t } = useTranslation();
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
          title: t("search"),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t("favorites"),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: t("sell"),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t("chat"),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: t("cabinet"),
        }}
      />
    </Tabs>
  );
}
