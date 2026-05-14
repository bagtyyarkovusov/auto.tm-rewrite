import { Text, View } from "react-native";

import LogoSvg from "../../assets/logos_color_red.svg";

type BrandLogoProps = {
  width?: number;
  height?: number;
};

export function BrandLogo({ width = 136, height = 24 }: BrandLogoProps) {
  const Logo = LogoSvg;

  return (
    <View
      accessibilityLabel="AutoTM"
      accessibilityRole="image"
      className="self-start"
    >
      {Logo ? (
        <Logo width={width} height={height} />
      ) : (
        <Text className="text-2xl font-bold text-brand-500">AutoTM</Text>
      )}
    </View>
  );
}
