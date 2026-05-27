import { View } from "react-native";
import { Phone, MessageSquare } from "lucide-react-native";
import type { WizardSchemas } from "@auto-tm/contracts";

import { useBrands } from "../../api/catalog/useBrands";
import { useModels } from "../../api/catalog/useModels";
import { useCities } from "../../api/catalog/useCities";


import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";

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
    <View className="gap-1 rounded-lg border-l-4 border-l-primary bg-muted/60 p-3">
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
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-foreground">
          Description *
        </Text>
        <Text className="text-xs text-muted-foreground">
          {descriptionLength}/2000
        </Text>
      </View>
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
          accessibilityLabel="Vehicle description"
        />,
        disabled,
      )}
      {fieldErrors?.description ? (
        <Text className="text-sm text-destructive" accessibilityLiveRegion="polite">
          {fieldErrors.description}
        </Text>
      ) : null}
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
          accessibilityLabel="Contact phone number"
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
      <View className="rounded-xl border border-border p-4 gap-1">
        <Text className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
          Contact methods
        </Text>

        <View className="flex-row items-center justify-between py-1">
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-muted">
              <Icon as={Phone} className="size-4 text-foreground" />
            </View>
            <View className="gap-0.5">
              <Text className="text-base text-foreground">Phone calls</Text>
              <Text className="text-xs text-muted-foreground">Buyers can call you directly</Text>
            </View>
          </View>
          <Switch
            checked={allowCalls}
            onCheckedChange={(v) => onChange({ allowCalls: v })}
            disabled={disabled}
          />
        </View>

        <View className="h-px bg-border my-1" />

        <View className="flex-row items-center justify-between py-1">
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-muted">
              <Icon as={MessageSquare} className="size-4 text-foreground" />
            </View>
            <View className="gap-0.5">
              <Text className="text-base text-foreground">In-app chat</Text>
              <Text className="text-xs text-muted-foreground">Chat when messaging launches</Text>
            </View>
          </View>
          <Switch
            checked={allowChat}
            onCheckedChange={(v) => onChange({ allowChat: v })}
            disabled={disabled}
          />
        </View>
      </View>

      {!hasContactMethod && (
        <Text className="text-sm text-destructive" accessibilityLiveRegion="polite">
          Choose at least one contact method
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
