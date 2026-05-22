import { View } from "react-native";
import type { WizardSchemas } from "@auto-tm/contracts";

import { useBrands } from "../../api/catalog/useBrands";
import { useModels } from "../../api/catalog/useModels";
import { useCities } from "../../api/catalog/useCities";


import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";

interface Step7DescContactProps {
  payload: WizardSchemas.WizardDraftPayload;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
  defaultPhone?: string;
}

function useReviewSummary(payload: WizardSchemas.WizardDraftPayload) {
  const { data: brandsData } = useBrands();
  const { data: modelsData } = useModels(payload.brandId ?? "");
  const { data: citiesData } = useCities(payload.regionId ?? "");

  const brandName =
    brandsData?.items.find((b) => b.id === payload.brandId)?.name ?? "";
  const modelName =
    modelsData?.items.find((m) => m.id === payload.modelId)?.name ?? "";
  const cityName =
    citiesData?.items.find((c) => c.id === payload.cityId)?.name ?? "";

  return { brandName, modelName, cityName };
}

function wrapDisabled(children: React.ReactNode, disabled: boolean) {
  if (!disabled) return <>{children}</>;
  return <View className="opacity-50">{children}</View>;
}

function ReviewSummary({
  payload,
}: {
  payload: WizardSchemas.WizardDraftPayload;
}) {
  const { brandName, modelName, cityName } = useReviewSummary(payload);

  return (
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
  );
}

function DescriptionInput({
  payload,
  onChange,
  fieldErrors,
  disabled,
}: {
  payload: WizardSchemas.WizardDraftPayload;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
  fieldErrors?: Record<string, string>;
  disabled: boolean;
}) {
  const descriptionLength = payload.description?.length ?? 0;

  return (
    <View className="gap-1.5">
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
        disabled,
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
  );
}

function ContactPhoneInput({
  payload,
  onChange,
  disabled,
  defaultPhone,
}: {
  payload: WizardSchemas.WizardDraftPayload;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
  disabled: boolean;
  defaultPhone: string;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">
        Contact phone
      </Text>
      {wrapDisabled(
        <Input
          value={payload.contactPhone ?? ""}
          onChangeText={(text) =>
            onChange({ contactPhone: text || undefined })
          }
          placeholder={defaultPhone ? `Default: ${defaultPhone}` : "Enter phone number"}
          editable={!disabled}
          keyboardType="phone-pad"
        />,
        disabled,
      )}
    </View>
  );
}

function ContactMethods({
  payload,
  onChange,
  disabled,
}: {
  payload: WizardSchemas.WizardDraftPayload;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
  disabled: boolean;
}) {
  const allowCalls = payload.allowCalls ?? true;
  const allowChat = payload.allowChat ?? true;
  const hasContactMethod = allowCalls || allowChat;

  return (
    <>
      <View className="gap-4">
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
    </>
  );
}

export default function Step7DescContact({
  payload,
  onChange,
  fieldErrors,
  disabled = false,
  defaultPhone = "",
}: Step7DescContactProps) {
  return (
    <View className="gap-5 py-5">
      <ReviewSummary payload={payload} />
      <DescriptionInput
        payload={payload}
        onChange={onChange}
        fieldErrors={fieldErrors}
        disabled={disabled}
      />
      <ContactPhoneInput
        payload={payload}
        onChange={onChange}
        disabled={disabled}
        defaultPhone={defaultPhone}
      />
      <ContactMethods
        payload={payload}
        onChange={onChange}
        disabled={disabled}
      />
    </View>
  );
}
