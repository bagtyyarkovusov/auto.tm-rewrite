import type { ReactNode } from "react";
import { useState } from "react";
import { View } from "react-native";

import type { SignInMethod } from "./SignInMethodTabs";

import { CrossFade } from "@/components/ui/motion";

/** Reserve the taller localized copy so changing methods moves no shared chrome. */
export function SignInMethodContent({ method, phone, email }: {
  method: SignInMethod; phone: ReactNode; email: ReactNode;
}) {
  const [heights, setHeights] = useState({ phone: 0, email: 0 });
  const isEmail = method === "email";
  function layer(content: ReactNode, hidden: boolean) {
    return <View accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}>{content}</View>;
  }
  return (
    <View style={{ minHeight: Math.max(heights.phone, heights.email) }}>
      {(["phone", "email"] as const).map((key) => (
        <View key={key} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          className="absolute inset-x-0 top-0 opacity-0"
          onLayout={(event) => {
            const height = event.nativeEvent.layout.height;
            setHeights((previous) => previous[key] === height ? previous : { ...previous, [key]: height });
          }}>
          {key === "phone" ? phone : email}
        </View>
      ))}
      <CrossFade active={isEmail} off={layer(phone, isEmail)} on={layer(email, !isEmail)} />
    </View>
  );
}
