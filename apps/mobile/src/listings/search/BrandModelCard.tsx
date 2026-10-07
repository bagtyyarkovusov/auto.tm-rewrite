import { Car, ChevronRight, X } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { CarBrandLogo } from "./CarBrandLogo";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { MotionView, usePressScale } from "@/components/ui/motion";
import { Text } from "@/components/ui/text";

/**
 * The brand and models Results is showing, on one raised card: the brand's
 * logo (or the car mark when no brand is chosen), the choice in bold, and
 * what a tap does in a quiet line under it. The card gives under a finger as
 * a whole; ✕ is a control of its own at its trailing edge.
 */
export function BrandModelCard({ brandName, brandLogoUrl, modelNames, hasBrand, onEdit, onClear }: {
  brandName?: string; brandLogoUrl?: string; modelNames: string[]; hasBrand: boolean; onEdit: () => void; onClear: () => void;
}) {
  const { t } = useTranslation();
  const press = usePressScale("surface");
  const title = hasBrand ? [brandName ?? t("loading"), modelNames[0]].filter(Boolean).join(" ") + (modelNames.length > 1 ? `, +${modelNames.length - 1}` : "") : t("brandModel");
  const hint = hasBrand ? modelNames.length ? t("resultsChangeModels") : t("resultsChooseModels") : t("resultsAllModels");
  return <MotionView style={press.style} className="flex-row items-center rounded-2xl bg-card pl-4 pr-2">
    <Pressable className="min-h-16 min-w-0 flex-1 flex-row items-center gap-3 py-3" onPress={onEdit} {...press.handlers}
      accessibilityRole="button" accessibilityLabel={`${title}, ${hint}`}>
      {hasBrand && brandName ? <CarBrandLogo name={brandName} logoUrl={brandLogoUrl} size={40} /> : <View className="size-10 items-center justify-center rounded-full bg-secondary"><Icon as={Car} className="size-5 text-foreground" /></View>}
      <View className="min-w-0 flex-1 gap-0.5"><Text className="text-body font-semibold text-foreground" numberOfLines={1}>{title}</Text><Text className="text-footnote text-muted-foreground" numberOfLines={1}>{hint}</Text></View>
      {!hasBrand ? <Icon as={ChevronRight} className="mr-2 size-5 text-muted-foreground" /> : null}
    </Pressable>
    {hasBrand ? <Button variant="ghost" size="icon" className="h-11 w-11" onPress={onClear} accessibilityLabel={t("resultsClearModels")}><Icon as={X} className="size-5 text-muted-foreground" /></Button> : null}
  </MotionView>;
}
