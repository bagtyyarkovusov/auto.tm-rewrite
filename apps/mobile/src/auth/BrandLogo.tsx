import { Text, View } from "react-native";

import LogoSvg from "../../assets/logo-carberk-red.svg";

type BrandLogoProps = {
  width?: number;
  height?: number;
};

/** The "carberk." wordmark. Its artwork is 5.5 times as wide as it is tall. */
export function BrandLogo({ width = 132, height = 24 }: BrandLogoProps) {
  const Logo = LogoSvg;

  return (
    <View
      accessibilityLabel="Carberk"
      accessibilityRole="image"
      className="self-start"
    >
      {Logo ? (
        <Logo width={width} height={height} />
      ) : (
        <Text className="text-headline font-bold text-brand-500">Carberk</Text>
      )}
    </View>
  );
}
