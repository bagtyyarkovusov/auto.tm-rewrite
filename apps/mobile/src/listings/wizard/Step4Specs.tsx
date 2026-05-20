import { X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Enums } from "@auto-tm/contracts";
import type { WizardSchemas } from "@auto-tm/contracts";

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
import { cn } from "@/lib/utils";

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
      className="h-10 w-10 rounded-full"
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  search: string;
  onSearchChange: (text: string) => void;
  items: { id: string; name: string }[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle>{title}</SheetTitle>
          <SheetCloseButton onPress={() => onOpenChange(false)} />
        </SheetHeader>
        <Input
          placeholder="Search..."
          value={search}
          onChangeText={onSearchChange}
          className="mb-2"
        />
        <ScrollView>
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item.id)}
              className={cn(
                "border-b border-gray-100 py-3",
                item.id === selectedId && "bg-gray-50",
              )}
            >
              <Text className="text-base text-foreground">{item.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colors: { id: string; name: string; hex?: string | null }[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle>Select color</SheetTitle>
          <SheetCloseButton onPress={() => onOpenChange(false)} />
        </SheetHeader>
        <ScrollView>
          {colors.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => onSelect(c.id)}
              className={cn(
                "flex-row items-center gap-2 border-b border-gray-100 py-3",
                c.id === selectedId && "bg-gray-50",
              )}
            >
              {c.hex && (
                <View
                  className="h-4 w-4 rounded-full border border-gray-200"
                  style={{ backgroundColor: c.hex }}
                />
              )}
              <Text className="text-base text-foreground">{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </SheetContent>
    </Sheet>
  );
}

function useSpecsStep(payload: WizardSchemas.WizardDraftPayload) {
  const condition = payload.condition ?? Enums.ListingCondition.Used;

  const { data: colorsData } = useColors();
  const colorPicker = useCatalogPicker(colorsData?.items ?? []);
  const selectedColor = colorsData?.items.find((c) => c.id === payload.colorId);

  const { data: bodyTypesData } = useBodyTypes();
  const bodyPicker = useCatalogPicker(bodyTypesData?.items ?? []);
  const selectedBodyType = bodyTypesData?.items.find(
    (b) => b.id === payload.bodyTypeId,
  );

  const { data: transmissionsData } = useTransmissions();
  const transmissionPicker = useCatalogPicker(transmissionsData?.items ?? []);
  const selectedTransmission = transmissionsData?.items.find(
    (t) => t.id === payload.transmissionId,
  );

  const { data: driveTypesData } = useDriveTypes();
  const drivePicker = useCatalogPicker(driveTypesData?.items ?? []);
  const selectedDriveType = driveTypesData?.items.find(
    (d) => d.id === payload.driveTypeId,
  );

  const { data: engineTypesData } = useEngineTypes();
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
    <View className="gap-6 py-4">
      <View className="gap-2">
        <Text className="font-uber text-[22px] font-bold leading-tight tracking-tight text-foreground">
          Specs
        </Text>
        <Text className="text-base leading-normal text-gray-600">
          Enter the specifications of your vehicle.
        </Text>
      </View>

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
    <View className="gap-2">
      <Text className="text-sm font-medium text-foreground">Condition</Text>
      <View className="flex-row gap-3">
        <Button
          variant={
            condition === Enums.ListingCondition.New ? "default" : "outline"
          }
          className={cn(
            "h-[52px] flex-1 rounded-full",
            condition === Enums.ListingCondition.New
              ? "bg-foreground"
              : "border-gray-200",
          )}
          onPress={() => {
            onChange({
              condition: Enums.ListingCondition.New,
              mileageKm: undefined,
            });
          }}
          disabled={disabled}
        >
          <Text
            className={cn(
              "text-base font-medium",
              condition === Enums.ListingCondition.New
                ? "text-background"
                : "text-foreground",
            )}
          >
            New
          </Text>
        </Button>
        <Button
          variant={
            condition === Enums.ListingCondition.Used ? "default" : "outline"
          }
          className={cn(
            "h-[52px] flex-1 rounded-full",
            condition === Enums.ListingCondition.Used
              ? "bg-foreground"
              : "border-gray-200",
          )}
          onPress={() => {
            onChange({ condition: Enums.ListingCondition.Used });
          }}
          disabled={disabled}
        >
          <Text
            className={cn(
              "text-base font-medium",
              condition === Enums.ListingCondition.Used
                ? "text-background"
                : "text-foreground",
            )}
          >
            Used
          </Text>
        </Button>
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
        <Text className="text-sm font-medium text-error">
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
        <Pressable
          onPress={onPress}
          disabled={disabled}
          className="flex-row items-center rounded-lg border border-gray-200 bg-background px-3.5"
          style={{ height: 52 }}
        >
          {selectedColor?.hex && (
            <View
              className="mr-2 h-4 w-4 rounded-full border border-gray-200"
              style={{ backgroundColor: selectedColor.hex }}
            />
          )}
          <Text
            className={cn(
              "text-[17px] leading-snug",
              selectedColor ? "text-foreground" : "text-gray-400",
            )}
          >
            {selectedColor?.name ?? "Select color"}
          </Text>
        </Pressable>,
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
        <Pressable
          onPress={onPress}
          disabled={disabled}
          className="flex-row items-center rounded-lg border border-gray-200 bg-background px-3.5"
          style={{ height: 52 }}
        >
          <Text
            className={cn(
              "text-[17px] leading-snug",
              selectedBodyType ? "text-foreground" : "text-gray-400",
            )}
          >
            {selectedBodyType?.name ?? "Select body type"}
          </Text>
        </Pressable>,
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
        <Pressable
          onPress={onPress}
          disabled={disabled}
          className="flex-row items-center rounded-lg border border-gray-200 bg-background px-3.5"
          style={{ height: 52 }}
        >
          <Text
            className={cn(
              "text-[17px] leading-snug",
              selectedTransmission ? "text-foreground" : "text-gray-400",
            )}
          >
            {selectedTransmission?.name ?? "Select transmission"}
          </Text>
        </Pressable>,
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
        <Pressable
          onPress={onPress}
          disabled={disabled}
          className="flex-row items-center rounded-lg border border-gray-200 bg-background px-3.5"
          style={{ height: 52 }}
        >
          <Text
            className={cn(
              "text-[17px] leading-snug",
              selectedDriveType ? "text-foreground" : "text-gray-400",
            )}
          >
            {selectedDriveType?.name ?? "Select drive type"}
          </Text>
        </Pressable>,
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
        <Pressable
          onPress={onPress}
          disabled={disabled}
          className="flex-row items-center rounded-lg border border-gray-200 bg-background px-3.5"
          style={{ height: 52 }}
        >
          <Text
            className={cn(
              "text-[17px] leading-snug",
              selectedEngineType ? "text-foreground" : "text-gray-400",
            )}
          >
            {selectedEngineType?.name ?? "Select engine type"}
          </Text>
        </Pressable>,
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
