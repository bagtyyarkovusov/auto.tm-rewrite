import { useEffect, useState } from "react";
import { View } from "react-native";

import { loadAuthSession } from "../../auth/session";
import { useBrands } from "../../api/catalog/useBrands";
import { useModels } from "../../api/catalog/useModels";
import { useCities } from "../../api/catalog/useCities";

import type { WizardSchemas } from "@auto-tm/contracts";

import { Text } from "@/components/ui/text";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

interface Step7DescContactProps {
  payload: WizardSchemas.WizardDraftPayload;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
}

export default function Step7DescContact({
  payload,
  onChange,
  fieldErrors,
  disabled,
}: Step7DescContactProps) {
  const [defaultPhone, setDefaultPhone] = useState("");

  useEffect(() => {
    loadAuthSession().then((s) => setDefaultPhone(s?.user.phone ?? ""));
  }, []);

  const { data: brandsData } = useBrands();
  const { data: modelsData } = useModels(payload.brandId ?? "");
  const { data: citiesData } = useCities(payload.regionId ?? "");

  const brandName =
    brandsData?.items.find((b) => b.id === payload.brandId)?.name ?? "";
  const modelName =
    modelsData?.items.find((m) => m.id === payload.modelId)?.name ?? "";
  const cityName =
    citiesData?.items.find((c) => c.id === payload.cityId)?.name ?? "";

  const allowCalls = payload.allowCalls ?? true;
  const allowChat = payload.allowChat ?? true;
  const hasContactMethod = allowCalls || allowChat;

  const descriptionLength = payload.description?.length ?? 0;

  const wrapDisabled = (children: React.ReactNode) => {
    if (!disabled) return <>{children}</>;
    return <View className="opacity-50">{children}</View>;
  };

  return (
    <View className="gap-4 py-4">
      {/* Review summary */}
      <View className="gap-1 rounded-lg bg-muted p-3">
        <Text className="text-sm font-medium text-foreground">
          {brandName} {modelName} {payload.year}
        </Text>
        <Text className="text-sm text-foreground">
          {payload.priceAmount
            ? `${payload.priceAmount.toLocaleString()} ${payload.priceCurrency}`
            : "—"}
        </Text>
        <Text className="text-sm text-muted-foreground">{cityName}</Text>
      </View>

      {/* Description */}
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">
          Description *
        </Text>
        {wrapDisabled(
          <Input
            value={payload.description ?? ""}
            onChangeText={(text) =>
              onChange({ description: text || undefined })
            }
            placeholder="Describe your vehicle..."
            multiline
            numberOfLines={4}
            editable={!disabled}
            className="h-auto min-h-[96px] py-2"
            maxLength={2000}
          />,
        )}
        <View className="flex-row items-center justify-between">
          {fieldErrors?.description ? (
            <Text className="text-sm text-destructive">
              {fieldErrors.description}
            </Text>
          ) : (
            <View />
          )}
          <Text className="text-xs text-muted-foreground">
            {descriptionLength}/2000
          </Text>
        </View>
      </View>

      {/* Contact phone */}
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">
          Contact phone
        </Text>
        {wrapDisabled(
          <Input
            value={payload.contactPhone ?? ""}
            onChangeText={(text) =>
              onChange({ contactPhone: text || undefined })
            }
            placeholder={`Default: ${defaultPhone}`}
            editable={!disabled}
            keyboardType="phone-pad"
          />,
        )}
      </View>

      {/* Contact methods */}
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-base text-foreground">Calls</Text>
          <Switch
            checked={allowCalls}
            onCheckedChange={(v) => onChange({ allowCalls: v })}
            disabled={disabled}
          />
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-base text-foreground">Chat</Text>
          <Switch
            checked={allowChat}
            onCheckedChange={(v) => onChange({ allowChat: v })}
            disabled={disabled}
          />
        </View>
      </View>

      <Text className="text-sm text-muted-foreground">
        Chat will become available when messaging launches.
      </Text>

      {!hasContactMethod && (
        <Text className="text-sm text-destructive">
          Choose calls or chat
        </Text>
      )}
    </View>
  );
}
