import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { useBrands } from "../../src/api/catalog/useBrands";

import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

type Locale = "tk" | "ru" | "en";

const LOCALES: { key: Locale; label: string }[] = [
  { key: "tk", label: "TK" },
  { key: "ru", label: "RU" },
  { key: "en", label: "EN" },
];

export default function DevCatalogScreen() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  const [locale, setLocale] = useState<Locale>("en");
  const { data, isPending, error, refetch } = useBrands(locale);

  return (
    <ScrollView className="flex-1 bg-background p-4">
      <Text className="text-2xl font-bold text-foreground mb-4">
        Brands ({data?.items?.length ?? 0})
      </Text>

      <View className="flex-row gap-2 mb-4">
        {LOCALES.map((l) => {
          const active = l.key === locale;
          return (
            <Pressable
              key={l.key}
              onPress={() => setLocale(l.key)}
              className={`px-4 py-2 rounded-lg ${
                active
                  ? "bg-primary"
                  : "bg-secondary active:bg-secondary/80"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  active ? "text-primary-foreground" : "text-secondary-foreground"
                }`}
              >
                {l.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isPending && (
        <Text className="text-muted-foreground">Loading brands...</Text>
      )}

      {error && (
        <View className="gap-2">
          <Text className="text-destructive">
            Error: {error instanceof Error ? error.message : "Unknown error"}
          </Text>
          <Pressable onPress={() => refetch()}>
            <Text className="text-primary underline">Retry</Text>
          </Pressable>
        </View>
      )}

      {data?.items.length === 0 && !isPending && !error && (
        <Text className="text-muted-foreground">No brands found.</Text>
      )}

      {data?.items.map((brand) => (
        <Card key={brand.id} className="mb-2">
          <CardContent className="p-4">
            <Text className="text-lg font-medium text-foreground">
              {brand.name}
            </Text>
            <Text className="text-sm text-muted-foreground">
              slug: {brand.slug}
              {brand.localeFallback
                ? ` (fallback: ${brand.localeFallback})`
                : ""}
            </Text>
          </CardContent>
        </Card>
      ))}
    </ScrollView>
  );
}
