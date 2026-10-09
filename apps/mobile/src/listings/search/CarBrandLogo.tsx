import { useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { useColorScheme } from "nativewind";

import { brandInitial } from "./brandPickerLogic";

import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";

interface CarBrandLogoProps {
  name: string;
  logoUrl?: string;
  /** Square size in points. */
  size?: number;
}

/**
 * A car brand's logo, shown only beside the brand's name (#350: never on its
 * own). Logos are single-colour PNGs tinted with the theme foreground. With
 * no uploaded logo, or when it fails to load, the brand's first letter shows
 * in a circle so the row never breaks. Decorative: the name next to it is
 * what screen readers announce. Not the Carberk app logo (`auth/BrandLogo`).
 */
export function CarBrandLogo({ name, logoUrl, size = 32 }: CarBrandLogoProps) {
  const { colorScheme } = useColorScheme();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = !!logoUrl && failedUrl !== logoUrl;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className="items-center justify-center rounded-full bg-muted"
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <Image
          source={{ uri: logoUrl }}
          // expo-image is not bridged with cssInterop, so it takes style props.
          style={{ width: size * 0.7, height: size * 0.7 }}
          contentFit="contain"
          tintColor={`hsl(${THEME[colorScheme ?? "light"].foreground})`}
          onError={() => setFailedUrl(logoUrl)}
          transition={100}
        />
      ) : (
        <Text className="text-callout font-semibold text-muted-foreground">
          {brandInitial(name)}
        </Text>
      )}
    </View>
  );
}
