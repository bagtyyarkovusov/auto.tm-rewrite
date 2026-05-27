import { AlertCircle, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { Enums } from "@auto-tm/contracts";
import type { WizardSchemas } from "@auto-tm/contracts";

import { cn } from "@/lib/utils";

import { useColors } from "../../api/catalog/useColors";
import { useBodyTypes } from "../../api/catalog/useBodyTypes";
import { useEngineTypes } from "../../api/catalog/useEngineTypes";
import { useTransmissions } from "../../api/catalog/useTransmissions";
import { useDriveTypes } from "../../api/catalog/useDriveTypes";


import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

interface Step4SpecsProps {
  payload: WizardSchemas.WizardDraftPayload;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
}

function SheetCloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onPress={onPress}
      accessibilityLabel="Close"
    >
      <Icon as={X} className="size-5 text-foreground" />
    </Button>
  );
}

function useCatalogPicker<T extends { id: string; name: string }>(
  items: T[],
) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return items;
    return items.filter((i) =>
      i.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [items, search]);

  const reset = () => setSearch("");

  return { open, setOpen, search, setSearch, filtered, reset };
}

function SpecPickerSheet({
  open,
  onOpenChange,
  title,
  search,
  onSearchChange,
  items,
  selectedId,
  onSelect,
  isLoading,
  isError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  search: string;
  onSearchChange: (text: string) => void;
  items: { id: string; name: string }[];
  selectedId?: string;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  isError?: boolean;
}) {
  const showSearch = items.length > 12;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent compact>
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle>{title}</SheetTitle>
          <SheetCloseButton onPress={() => onOpenChange(false)} />
        </SheetHeader>
        {showSearch && (
          <Input
            placeholder="Search..."
            value={search}
            onChangeText={onSearchChange}
            className="mb-2"
          />
        )}
        {isLoading ? (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" />
            <Text className="mt-2 text-sm text-muted-foreground">Loading...</Text>
          </View>
        ) : isError ? (
          <View className="py-4 items-center">
            <Icon as={AlertCircle} className="size-6 text-destructive" />
            <Text className="mt-2 text-sm text-destructive">Failed to load options</Text>
          </View>
        ) : items.length === 0 ? (
          <View className="py-4 items-center">
            <Text className="text-sm text-muted-foreground">No options available</Text>
          </View>
        ) : (
          <ScrollView>
            {items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => onSelect(item.id)}
                className={`flex-row items-center border-b border-border py-3 px-1 ${
                  item.id === selectedId ? "bg-muted" : ""
                }`}
              >
                {item.id === selectedId && (
                  <View className="mr-2 h-2 w-2 rounded-full bg-primary" />
                )}
                <Text className="text-base text-foreground">{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ColorPickerSheet({
  open,
  onOpenChange,
  colors,
  selectedId,
  onSelect,
  isLoading,
  isError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colors: { id: string; name: string; hex?: string | null }[];
  selectedId?: string;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  isError?: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent compact>
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle>Select color</SheetTitle>
          <SheetCloseButton onPress={() => onOpenChange(false)} />
        </SheetHeader>
        {isLoading ? (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" />
            <Text className="mt-2 text-sm text-muted-foreground">Loading...</Text>
          </View>
        ) : isError ? (
          <View className="py-4 items-center">
            <Icon as={AlertCircle} className="size-6 text-destructive" />
            <Text className="mt-2 text-sm text-destructive">Failed to load colors</Text>
          </View>
        ) : colors.length === 0 ? (
          <View className="py-4 items-center">
            <Text className="text-sm text-muted-foreground">No colors available</Text>
          </View>
        ) : (
          <ScrollView>
            {colors.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => onSelect(c.id)}
                className={`flex-row items-center gap-3 border-b border-border py-3 px-1 ${
                  c.id === selectedId ? "bg-muted" : ""
                }`}
              >
                {c.hex ? (
                  <View
                    className="h-6 w-6 rounded-full border border-border"
                    style={{ backgroundColor: c.hex }}
                  />
                ) : (
                  <View className="h-6 w-6 rounded-full border border-border bg-muted" />
                )}
                <Text className="text-base text-foreground">{c.name}</Text>
                {c.id === selectedId && (
                  <View className="ml-auto mr-2 h-2 w-2 rounded-full bg-primary" />
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </SheetContent>
    </Sheet>
  );
}

function useSpecsStep(payload: WizardSchemas.WizardDraftPayload) {
  const condition = payload.condition ?? Enums.ListingCondition.Used;

  const { data: colorsData, isPending: colorsLoading, isError: colorsError } = useColors();
  const colorPicker = useCatalogPicker(colorsData?.items ?? []);
  const selectedColor = colorsData?.items.find((c) => c.id === payload.colorId);

  const { data: bodyTypesData, isPending: bodyTypesLoading, isError: bodyTypesError } = useBodyTypes();
  const bodyPicker = useCatalogPicker(bodyTypesData?.items ?? []);
  const selectedBodyType = bodyTypesData?.items.find(
    (b) => b.id === payload.bodyTypeId,
  );

  const { data: transmissionsData, isPending: transmissionsLoading, isError: transmissionsError } = useTransmissions();
  const transmissionPicker = useCatalogPicker(transmissionsData?.items ?? []);
  const selectedTransmission = transmissionsData?.items.find(
    (t) => t.id === payload.transmissionId,
  );

  const { data: driveTypesData, isPending: driveTypesLoading, isError: driveTypesError } = useDriveTypes();
  const drivePicker = useCatalogPicker(driveTypesData?.items ?? []);
  const selectedDriveType = driveTypesData?.items.find(
    (d) => d.id === payload.driveTypeId,
  );

  const { data: engineTypesData, isPending: engineTypesLoading, isError: engineTypesError } = useEngineTypes();
  const enginePicker = useCatalogPicker(engineTypesData?.items ?? []);
  const selectedEngineType = engineTypesData?.items.find(
    (e) => e.id === payload.engineTypeId,
  );

  return {
    condition,
    colorPicker,
    selectedColor,
    bodyPicker,
    selectedBodyType,
    transmissionPicker,
    selectedTransmission,
    drivePicker,
    selectedDriveType,
    enginePicker,
    selectedEngineType,
    colorsLoading,
    colorsError,
    bodyTypesLoading,
    bodyTypesError,
    transmissionsLoading,
    transmissionsError,
    driveTypesLoading,
    driveTypesError,
    engineTypesLoading,
    engineTypesError,
  };
}

function wrapDisabled(children: React.ReactNode, disabled: boolean) {
  if (!disabled) return <>{children}</>;
  return <View className="opacity-50">{children}</View>;
}

function SpecSheets({
  payload,
  onChange,
  specs,
}: {
  payload: WizardSchemas.WizardDraftPayload;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
  specs: ReturnType<typeof useSpecsStep>;
}) {
  return (
    <>
      <ColorPickerSheet
        open={specs.colorPicker.open}
        onOpenChange={(open) => {
          specs.colorPicker.setOpen(open);
          if (!open) specs.colorPicker.reset();
        }}
        colors={specs.colorPicker.filtered}
        selectedId={payload.colorId}
        onSelect={(id) => {
          onChange({ colorId: id });
          specs.colorPicker.setOpen(false);
          specs.colorPicker.reset();
        }}
        isLoading={specs.colorsLoading}
        isError={specs.colorsError}
      />

      <SpecPickerSheet
        open={specs.bodyPicker.open}
        onOpenChange={(open) => {
          specs.bodyPicker.setOpen(open);
          if (!open) specs.bodyPicker.reset();
        }}
        title="Select body type"
        search={specs.bodyPicker.search}
        onSearchChange={specs.bodyPicker.setSearch}
        items={specs.bodyPicker.filtered}
        selectedId={payload.bodyTypeId}
        onSelect={(id) => {
          onChange({ bodyTypeId: id });
          specs.bodyPicker.setOpen(false);
          specs.bodyPicker.reset();
        }}
        isLoading={specs.bodyTypesLoading}
        isError={specs.bodyTypesError}
      />

      <SpecPickerSheet
        open={specs.transmissionPicker.open}
        onOpenChange={(open) => {
          specs.transmissionPicker.setOpen(open);
          if (!open) specs.transmissionPicker.reset();
        }}
        title="Select transmission"
        search={specs.transmissionPicker.search}
        onSearchChange={specs.transmissionPicker.setSearch}
        items={specs.transmissionPicker.filtered}
        selectedId={payload.transmissionId}
        onSelect={(id) => {
          onChange({ transmissionId: id });
          specs.transmissionPicker.setOpen(false);
          specs.transmissionPicker.reset();
        }}
        isLoading={specs.transmissionsLoading}
        isError={specs.transmissionsError}
      />

      <SpecPickerSheet
        open={specs.drivePicker.open}
        onOpenChange={(open) => {
          specs.drivePicker.setOpen(open);
          if (!open) specs.drivePicker.reset();
        }}
        title="Select drive type"
        search={specs.drivePicker.search}
        onSearchChange={specs.drivePicker.setSearch}
        items={specs.drivePicker.filtered}
        selectedId={payload.driveTypeId}
        onSelect={(id) => {
          onChange({ driveTypeId: id });
          specs.drivePicker.setOpen(false);
          specs.drivePicker.reset();
        }}
        isLoading={specs.driveTypesLoading}
        isError={specs.driveTypesError}
      />

      <SpecPickerSheet
        open={specs.enginePicker.open}
        onOpenChange={(open) => {
          specs.enginePicker.setOpen(open);
          if (!open) specs.enginePicker.reset();
        }}
        title="Select engine type"
        search={specs.enginePicker.search}
        onSearchChange={specs.enginePicker.setSearch}
        items={specs.enginePicker.filtered}
        selectedId={payload.engineTypeId}
        onSelect={(id) => {
          onChange({ engineTypeId: id });
          specs.enginePicker.setOpen(false);
          specs.enginePicker.reset();
        }}
        isLoading={specs.engineTypesLoading}
        isError={specs.engineTypesError}
      />
    </>
  );
}

export default function Step4Specs({
  payload,
  onChange,
  fieldErrors,
  disabled = false,
}: Step4SpecsProps) {
  const specs = useSpecsStep(payload);

  return (
    <View className="gap-5 py-5">
      <ConditionToggle
        condition={specs.condition}
        disabled={disabled}
        onChange={onChange}
      />

      {specs.condition === Enums.ListingCondition.Used && (
        <MileageInput
          payload={payload}
          onChange={onChange}
          fieldErrors={fieldErrors}
          disabled={disabled}
        />
      )}

      <ColorPicker
        selectedColor={specs.selectedColor}
        disabled={disabled}
        onPress={() => specs.colorPicker.setOpen(true)}
      />

      <BodyTypePicker
        selectedBodyType={specs.selectedBodyType}
        disabled={disabled}
        onPress={() => specs.bodyPicker.setOpen(true)}
      />

      {/* Drivetrain group */}
      <View className="gap-5 rounded-xl border border-border p-4">
        <Text className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Drivetrain
        </Text>
        <TransmissionPicker
          selectedTransmission={specs.selectedTransmission}
          disabled={disabled}
          onPress={() => specs.transmissionPicker.setOpen(true)}
        />
        <DriveTypePicker
          selectedDriveType={specs.selectedDriveType}
          disabled={disabled}
          onPress={() => specs.drivePicker.setOpen(true)}
        />
      </View>

      {/* Engine group */}
      <View className="gap-5 rounded-xl border border-border p-4">
        <Text className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Engine
        </Text>
        <EngineTypePicker
          selectedEngineType={specs.selectedEngineType}
          disabled={disabled}
          onPress={() => specs.enginePicker.setOpen(true)}
        />
        <EnginePowerInput
          payload={payload}
          onChange={onChange}
          disabled={disabled}
        />
      </View>

      <SpecSheets payload={payload} onChange={onChange} specs={specs} />
    </View>
  );
}

function ConditionToggle({
  condition,
  disabled,
  onChange,
}: {
  condition: Enums.ListingCondition;
  disabled: boolean;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">Condition</Text>
      <View className="flex-row rounded-lg bg-muted p-1">
        <Pressable
          onPress={() => {
            onChange({
              condition: Enums.ListingCondition.New,
              mileageKm: undefined,
            });
          }}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: condition === Enums.ListingCondition.New }}
          accessibilityLabel="New condition"
          className={cn(
            "flex-1 items-center justify-center rounded-md py-2.5",
            condition === Enums.ListingCondition.New && "bg-card",
            disabled && "opacity-50",
          )}
        >
          <Text
            className={cn(
              "text-sm font-medium",
              condition === Enums.ListingCondition.New
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            New
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            onChange({ condition: Enums.ListingCondition.Used });
          }}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: condition === Enums.ListingCondition.Used }}
          accessibilityLabel="Used condition"
          className={cn(
            "flex-1 items-center justify-center rounded-md py-2.5",
            condition === Enums.ListingCondition.Used && "bg-card",
            disabled && "opacity-50",
          )}
        >
          <Text
            className={cn(
              "text-sm font-medium",
              condition === Enums.ListingCondition.Used
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            Used
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function MileageInput({
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
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">
        Mileage, km *
      </Text>
      {wrapDisabled(
        <Input
          value={payload.mileageKm?.toString() ?? ""}
          onChangeText={(text) => {
            const num = parseInt(text, 10);
            onChange({
              mileageKm: Number.isNaN(num) ? undefined : num,
            });
          }}
          placeholder="e.g. 50000"
          keyboardType="number-pad"
          editable={!disabled}
        />,
        disabled,
      )}
      {fieldErrors?.mileageKm && (
        <Text className="text-sm text-destructive" accessibilityLiveRegion="polite">
          {fieldErrors.mileageKm}
        </Text>
      )}
    </View>
  );
}

function ColorPicker({
  selectedColor,
  disabled,
  onPress,
}: {
  selectedColor?: { name: string; hex?: string | null };
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">Color</Text>
      {wrapDisabled(
        <Button
          variant="outline"
          onPress={onPress}
          disabled={disabled}
          className="justify-start h-[52px]"
        >
          {selectedColor?.hex && (
            <View
              className="mr-3 h-6 w-6 rounded-full border border-border"
              style={{ backgroundColor: selectedColor.hex }}
            />
          )}
          <Text
            className={
              selectedColor ? "text-foreground font-medium" : "text-muted-foreground"
            }
          >
            {selectedColor?.name ?? "Select color"}
          </Text>
        </Button>,
        disabled,
      )}
    </View>
  );
}

function BodyTypePicker({
  selectedBodyType,
  disabled,
  onPress,
}: {
  selectedBodyType?: { name: string };
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">Body type</Text>
      {wrapDisabled(
        <Button
          variant="outline"
          onPress={onPress}
          disabled={disabled}
          className="justify-start h-[52px]"
        >
          <Text
            className={
              selectedBodyType ? "text-foreground font-medium" : "text-muted-foreground"
            }
          >
            {selectedBodyType?.name ?? "Select body type"}
          </Text>
        </Button>,
        disabled,
      )}
    </View>
  );
}

function TransmissionPicker({
  selectedTransmission,
  disabled,
  onPress,
}: {
  selectedTransmission?: { name: string };
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">
        Transmission
      </Text>
      {wrapDisabled(
        <Button
          variant="outline"
          onPress={onPress}
          disabled={disabled}
          className="justify-start h-[52px]"
        >
          <Text
            className={
              selectedTransmission
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            }
          >
            {selectedTransmission?.name ?? "Select transmission"}
          </Text>
        </Button>,
        disabled,
      )}
    </View>
  );
}

function DriveTypePicker({
  selectedDriveType,
  disabled,
  onPress,
}: {
  selectedDriveType?: { name: string };
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">Drive type</Text>
      {wrapDisabled(
        <Button
          variant="outline"
          onPress={onPress}
          disabled={disabled}
          className="justify-start h-[52px]"
        >
          <Text
            className={
              selectedDriveType ? "text-foreground font-medium" : "text-muted-foreground"
            }
          >
            {selectedDriveType?.name ?? "Select drive type"}
          </Text>
        </Button>,
        disabled,
      )}
    </View>
  );
}

function EngineTypePicker({
  selectedEngineType,
  disabled,
  onPress,
}: {
  selectedEngineType?: { name: string };
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">Engine type</Text>
      {wrapDisabled(
        <Button
          variant="outline"
          onPress={onPress}
          disabled={disabled}
          className="justify-start h-[52px]"
        >
          <Text
            className={
              selectedEngineType ? "text-foreground font-medium" : "text-muted-foreground"
            }
          >
            {selectedEngineType?.name ?? "Select engine type"}
          </Text>
        </Button>,
        disabled,
      )}
    </View>
  );
}

function EnginePowerInput({
  payload,
  onChange,
  disabled,
}: {
  payload: WizardSchemas.WizardDraftPayload;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
  disabled: boolean;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">
        Engine power (hp)
      </Text>
      {wrapDisabled(
        <Input
          value={payload.enginePower?.toString() ?? ""}
          onChangeText={(text) => {
            const num = parseInt(text, 10);
            onChange({
              enginePower: Number.isNaN(num) ? undefined : num,
            });
          }}
          placeholder="e.g. 150"
          keyboardType="number-pad"
          editable={!disabled}
        />,
        disabled,
      )}
    </View>
  );
}
