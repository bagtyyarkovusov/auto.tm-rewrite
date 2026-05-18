import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Enums } from "@auto-tm/contracts";

import { useColors } from "../../api/catalog/useColors";
import { useBodyTypes } from "../../api/catalog/useBodyTypes";
import { useEngineTypes } from "../../api/catalog/useEngineTypes";
import { useTransmissions } from "../../api/catalog/useTransmissions";
import { useDriveTypes } from "../../api/catalog/useDriveTypes";


import type { WizardPayload } from "./types";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface StepProps {
  payload: WizardPayload;
  onChange: (updates: Partial<WizardPayload>) => void;
  disabled?: boolean;
  disabledTooltip?: string;
}

export default function Step4Specs({
  payload,
  onChange,
  disabled,
}: StepProps) {
  const condition = payload.condition ?? Enums.ListingCondition.Used;

  // Color sheet
  const [colorOpen, setColorOpen] = useState(false);
  const [colorSearch, setColorSearch] = useState("");
  const { data: colorsData } = useColors();
  const filteredColors = useMemo(() => {
    if (!colorSearch) return colorsData?.items ?? [];
    return (colorsData?.items ?? []).filter((c) =>
      c.name.toLowerCase().includes(colorSearch.toLowerCase()),
    );
  }, [colorsData, colorSearch]);
  const selectedColor = colorsData?.items.find(
    (c) => c.id === payload.colorId,
  );

  // Body type sheet
  const [bodyOpen, setBodyOpen] = useState(false);
  const [bodySearch, setBodySearch] = useState("");
  const { data: bodyTypesData } = useBodyTypes();
  const filteredBodyTypes = useMemo(() => {
    if (!bodySearch) return bodyTypesData?.items ?? [];
    return (bodyTypesData?.items ?? []).filter((b) =>
      b.name.toLowerCase().includes(bodySearch.toLowerCase()),
    );
  }, [bodyTypesData, bodySearch]);
  const selectedBodyType = bodyTypesData?.items.find(
    (b) => b.id === payload.bodyTypeId,
  );

  // Transmission sheet
  const [transmissionOpen, setTransmissionOpen] = useState(false);
  const [transmissionSearch, setTransmissionSearch] = useState("");
  const { data: transmissionsData } = useTransmissions();
  const filteredTransmissions = useMemo(() => {
    if (!transmissionSearch) return transmissionsData?.items ?? [];
    return (transmissionsData?.items ?? []).filter((t) =>
      t.name.toLowerCase().includes(transmissionSearch.toLowerCase()),
    );
  }, [transmissionsData, transmissionSearch]);
  const selectedTransmission = transmissionsData?.items.find(
    (t) => t.id === payload.transmissionId,
  );

  // Drive type sheet
  const [driveOpen, setDriveOpen] = useState(false);
  const [driveSearch, setDriveSearch] = useState("");
  const { data: driveTypesData } = useDriveTypes();
  const filteredDriveTypes = useMemo(() => {
    if (!driveSearch) return driveTypesData?.items ?? [];
    return (driveTypesData?.items ?? []).filter((d) =>
      d.name.toLowerCase().includes(driveSearch.toLowerCase()),
    );
  }, [driveTypesData, driveSearch]);
  const selectedDriveType = driveTypesData?.items.find(
    (d) => d.id === payload.driveTypeId,
  );

  // Engine type sheet
  const [engineOpen, setEngineOpen] = useState(false);
  const [engineSearch, setEngineSearch] = useState("");
  const { data: engineTypesData } = useEngineTypes();
  const filteredEngineTypes = useMemo(() => {
    if (!engineSearch) return engineTypesData?.items ?? [];
    return (engineTypesData?.items ?? []).filter((e) =>
      e.name.toLowerCase().includes(engineSearch.toLowerCase()),
    );
  }, [engineTypesData, engineSearch]);
  const selectedEngineType = engineTypesData?.items.find(
    (e) => e.id === payload.engineTypeId,
  );

  const wrapDisabled = (children: React.ReactNode) => {
    if (!disabled) return <>{children}</>;
    return <View className="opacity-50">{children}</View>;
  };

  return (
    <View className="gap-4 py-4">
      {/* Condition */}
      <View className="gap-2">
        <Text className="text-sm font-medium text-foreground">Condition</Text>
        <View className="flex-row gap-3">
          <Button
            variant={
              condition === Enums.ListingCondition.New ? "default" : "outline"
            }
            className="flex-1"
            onPress={() => {
              onChange({
                condition: Enums.ListingCondition.New,
                mileageKm: undefined,
              });
            }}
            disabled={disabled}
          >
            <Text>New</Text>
          </Button>
          <Button
            variant={
              condition === Enums.ListingCondition.Used ? "default" : "outline"
            }
            className="flex-1"
            onPress={() => {
              onChange({ condition: Enums.ListingCondition.Used });
            }}
            disabled={disabled}
          >
            <Text>Used</Text>
          </Button>
        </View>
      </View>

      {/* Mileage */}
      {condition === Enums.ListingCondition.Used && (
        <View className="gap-1">
          <Text className="text-sm font-medium text-foreground">
            Mileage (km) *
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
          )}
        </View>
      )}

      {/* Color */}
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">Color</Text>
        {wrapDisabled(
          <Button
            variant="outline"
            onPress={() => setColorOpen(true)}
            disabled={disabled}
            className="justify-start"
          >
            {selectedColor?.hex && (
              <View
                className="mr-2 h-4 w-4 rounded-full border border-border"
                style={{ backgroundColor: selectedColor.hex }}
              />
            )}
            <Text
              className={
                selectedColor ? "text-foreground" : "text-muted-foreground"
              }
            >
              {selectedColor?.name ?? "Select color"}
            </Text>
          </Button>,
        )}
      </View>

      {/* Body type */}
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">Body type</Text>
        {wrapDisabled(
          <Button
            variant="outline"
            onPress={() => setBodyOpen(true)}
            disabled={disabled}
            className="justify-start"
          >
            <Text
              className={
                selectedBodyType ? "text-foreground" : "text-muted-foreground"
              }
            >
              {selectedBodyType?.name ?? "Select body type"}
            </Text>
          </Button>,
        )}
      </View>

      {/* Transmission */}
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">
          Transmission
        </Text>
        {wrapDisabled(
          <Button
            variant="outline"
            onPress={() => setTransmissionOpen(true)}
            disabled={disabled}
            className="justify-start"
          >
            <Text
              className={
                selectedTransmission
                  ? "text-foreground"
                  : "text-muted-foreground"
              }
            >
              {selectedTransmission?.name ?? "Select transmission"}
            </Text>
          </Button>,
        )}
      </View>

      {/* Drive type */}
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">Drive type</Text>
        {wrapDisabled(
          <Button
            variant="outline"
            onPress={() => setDriveOpen(true)}
            disabled={disabled}
            className="justify-start"
          >
            <Text
              className={
                selectedDriveType
                  ? "text-foreground"
                  : "text-muted-foreground"
              }
            >
              {selectedDriveType?.name ?? "Select drive type"}
            </Text>
          </Button>,
        )}
      </View>

      {/* Engine type */}
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">Engine type</Text>
        {wrapDisabled(
          <Button
            variant="outline"
            onPress={() => setEngineOpen(true)}
            disabled={disabled}
            className="justify-start"
          >
            <Text
              className={
                selectedEngineType
                  ? "text-foreground"
                  : "text-muted-foreground"
              }
            >
              {selectedEngineType?.name ?? "Select engine type"}
            </Text>
          </Button>,
        )}
      </View>

      {/* Engine power */}
      <View className="gap-1">
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
        )}
      </View>

      {/* Color Sheet */}
      <Sheet open={colorOpen} onOpenChange={setColorOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Select color</SheetTitle>
          </SheetHeader>
          <Input
            placeholder="Search..."
            value={colorSearch}
            onChangeText={setColorSearch}
            className="mb-2"
          />
          <ScrollView className="max-h-80">
            {filteredColors.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  onChange({ colorId: c.id });
                  setColorOpen(false);
                  setColorSearch("");
                }}
                className="flex-row items-center gap-2 border-b border-border py-3"
              >
                {c.hex && (
                  <View
                    className="h-4 w-4 rounded-full border border-border"
                    style={{ backgroundColor: c.hex }}
                  />
                )}
                <Text className="text-base text-foreground">{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Button
            variant="outline"
            onPress={() => setColorOpen(false)}
            className="mt-2"
          >
            <Text>Cancel</Text>
          </Button>
        </SheetContent>
      </Sheet>

      {/* Body type Sheet */}
      <Sheet open={bodyOpen} onOpenChange={setBodyOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Select body type</SheetTitle>
          </SheetHeader>
          <Input
            placeholder="Search..."
            value={bodySearch}
            onChangeText={setBodySearch}
            className="mb-2"
          />
          <ScrollView className="max-h-80">
            {filteredBodyTypes.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => {
                  onChange({ bodyTypeId: b.id });
                  setBodyOpen(false);
                  setBodySearch("");
                }}
                className="border-b border-border py-3"
              >
                <Text className="text-base text-foreground">{b.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Button
            variant="outline"
            onPress={() => setBodyOpen(false)}
            className="mt-2"
          >
            <Text>Cancel</Text>
          </Button>
        </SheetContent>
      </Sheet>

      {/* Transmission Sheet */}
      <Sheet open={transmissionOpen} onOpenChange={setTransmissionOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Select transmission</SheetTitle>
          </SheetHeader>
          <Input
            placeholder="Search..."
            value={transmissionSearch}
            onChangeText={setTransmissionSearch}
            className="mb-2"
          />
          <ScrollView className="max-h-80">
            {filteredTransmissions.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => {
                  onChange({ transmissionId: t.id });
                  setTransmissionOpen(false);
                  setTransmissionSearch("");
                }}
                className="border-b border-border py-3"
              >
                <Text className="text-base text-foreground">{t.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Button
            variant="outline"
            onPress={() => setTransmissionOpen(false)}
            className="mt-2"
          >
            <Text>Cancel</Text>
          </Button>
        </SheetContent>
      </Sheet>

      {/* Drive type Sheet */}
      <Sheet open={driveOpen} onOpenChange={setDriveOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Select drive type</SheetTitle>
          </SheetHeader>
          <Input
            placeholder="Search..."
            value={driveSearch}
            onChangeText={setDriveSearch}
            className="mb-2"
          />
          <ScrollView className="max-h-80">
            {filteredDriveTypes.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => {
                  onChange({ driveTypeId: d.id });
                  setDriveOpen(false);
                  setDriveSearch("");
                }}
                className="border-b border-border py-3"
              >
                <Text className="text-base text-foreground">{d.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Button
            variant="outline"
            onPress={() => setDriveOpen(false)}
            className="mt-2"
          >
            <Text>Cancel</Text>
          </Button>
        </SheetContent>
      </Sheet>

      {/* Engine type Sheet */}
      <Sheet open={engineOpen} onOpenChange={setEngineOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Select engine type</SheetTitle>
          </SheetHeader>
          <Input
            placeholder="Search..."
            value={engineSearch}
            onChangeText={setEngineSearch}
            className="mb-2"
          />
          <ScrollView className="max-h-80">
            {filteredEngineTypes.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => {
                  onChange({ engineTypeId: e.id });
                  setEngineOpen(false);
                  setEngineSearch("");
                }}
                className="border-b border-border py-3"
              >
                <Text className="text-base text-foreground">{e.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Button
            variant="outline"
            onPress={() => setEngineOpen(false)}
            className="mt-2"
          >
            <Text>Cancel</Text>
          </Button>
        </SheetContent>
      </Sheet>
    </View>
  );
}
