import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { useBrands } from "../../api/catalog/useBrands";
import { useModels } from "../../api/catalog/useModels";
import { useGenerations } from "../../api/catalog/useGenerations";

import type { WizardPayload } from "./types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";



interface StepProps {
  payload: WizardPayload;
  onChange: (updates: Partial<WizardPayload>) => void;
  disabled?: boolean;
  disabledTooltip?: string;
}

export default function Step3VehicleId({
  payload,
  onChange,
  disabled,
}: StepProps) {
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [generationOpen, setGenerationOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [generationSearch, setGenerationSearch] = useState("");

  const { data: brandsData } = useBrands();
  const { data: modelsData } = useModels(payload.brandId ?? "");
  const { data: generationsData } = useGenerations(payload.modelId ?? "");

  const filteredBrands = useMemo(() => {
    if (!brandSearch) return brandsData?.items ?? [];
    return (brandsData?.items ?? []).filter((b) =>
      b.name.toLowerCase().includes(brandSearch.toLowerCase()),
    );
  }, [brandsData, brandSearch]);

  const filteredModels = useMemo(() => {
    if (!modelSearch) return modelsData?.items ?? [];
    return (modelsData?.items ?? []).filter((m) =>
      m.name.toLowerCase().includes(modelSearch.toLowerCase()),
    );
  }, [modelsData, modelSearch]);

  const filteredGenerations = useMemo(() => {
    if (!generationSearch) return generationsData?.items ?? [];
    return (generationsData?.items ?? []).filter((g) =>
      g.name.toLowerCase().includes(generationSearch.toLowerCase()),
    );
  }, [generationsData, generationSearch]);

  const selectedBrand = brandsData?.items.find(
    (b) => b.id === payload.brandId,
  );
  const selectedModel = modelsData?.items.find(
    (m) => m.id === payload.modelId,
  );
  const selectedGeneration = generationsData?.items.find(
    (g) => g.id === payload.generationId,
  );

  function handleSelectBrand(brandId: string) {
    onChange({ brandId, modelId: undefined, generationId: undefined });
    setBrandOpen(false);
    setBrandSearch("");
  }

  function handleSelectModel(modelId: string) {
    onChange({ modelId, generationId: undefined });
    setModelOpen(false);
    setModelSearch("");
  }

  function handleSelectGeneration(generationId: string) {
    onChange({ generationId });
    setGenerationOpen(false);
    setGenerationSearch("");
  }

  const wrapDisabled = (children: React.ReactNode) => {
    if (!disabled) return <>{children}</>;
    return <View className="opacity-50">{children}</View>;
  };

  return (
    <View className="gap-4 py-4">
      {/* Brand */}
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">Brand *</Text>
        {wrapDisabled(
          <Button
            variant="outline"
            onPress={() => setBrandOpen(true)}
            disabled={disabled}
            className="justify-start"
          >
            <Text
              className={
                selectedBrand ? "text-foreground" : "text-muted-foreground"
              }
            >
              {selectedBrand?.name ?? "Select brand"}
            </Text>
          </Button>,
        )}
      </View>

      {/* Model */}
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">Model *</Text>
        {wrapDisabled(
          <Button
            variant="outline"
            onPress={() => setModelOpen(true)}
            disabled={disabled || !payload.brandId}
            className="justify-start"
          >
            <Text
              className={
                selectedModel ? "text-foreground" : "text-muted-foreground"
              }
            >
              {selectedModel?.name ?? "Select model"}
            </Text>
          </Button>,
        )}
      </View>

      {/* Generation */}
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">
          Generation
        </Text>
        {!payload.modelId ? (
          <Text className="text-sm text-muted-foreground">
            Select a model first
          </Text>
        ) : generationsData?.items.length === 0 ? (
          <Text className="text-sm text-muted-foreground">
            No generations available — skip this step
          </Text>
        ) : (
          wrapDisabled(
            <Button
              variant="outline"
              onPress={() => setGenerationOpen(true)}
              disabled={disabled}
              className="justify-start"
            >
              <Text
                className={
                  selectedGeneration
                    ? "text-foreground"
                    : "text-muted-foreground"
                }
              >
                {selectedGeneration?.name ?? "Select generation"}
              </Text>
            </Button>,
          )
        )}
      </View>

      {/* Year */}
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">Year *</Text>
        {wrapDisabled(
          <Input
            value={payload.year?.toString() ?? ""}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              onChange({
                year: Number.isNaN(num) ? undefined : num,
              });
            }}
            placeholder="2020"
            keyboardType="number-pad"
            editable={!disabled}
            maxLength={4}
          />,
        )}
      </View>

      {/* Brand Sheet */}
      <Sheet open={brandOpen} onOpenChange={setBrandOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Select brand</SheetTitle>
          </SheetHeader>
          <Input
            placeholder="Search brands..."
            value={brandSearch}
            onChangeText={setBrandSearch}
            className="mb-2"
          />
          <ScrollView className="max-h-80">
            {filteredBrands.map((brand) => (
              <Pressable
                key={brand.id}
                onPress={() => handleSelectBrand(brand.id)}
                className="border-b border-border py-3"
              >
                <Text className="text-base text-foreground">{brand.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Button
            variant="outline"
            onPress={() => setBrandOpen(false)}
            className="mt-2"
          >
            <Text>Cancel</Text>
          </Button>
        </SheetContent>
      </Sheet>

      {/* Model Sheet */}
      <Sheet open={modelOpen} onOpenChange={setModelOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Select model</SheetTitle>
          </SheetHeader>
          <Input
            placeholder="Search models..."
            value={modelSearch}
            onChangeText={setModelSearch}
            className="mb-2"
          />
          <ScrollView className="max-h-80">
            {filteredModels.map((model) => (
              <Pressable
                key={model.id}
                onPress={() => handleSelectModel(model.id)}
                className="border-b border-border py-3"
              >
                <Text className="text-base text-foreground">{model.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Button
            variant="outline"
            onPress={() => setModelOpen(false)}
            className="mt-2"
          >
            <Text>Cancel</Text>
          </Button>
        </SheetContent>
      </Sheet>

      {/* Generation Sheet */}
      <Sheet open={generationOpen} onOpenChange={setGenerationOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Select generation</SheetTitle>
          </SheetHeader>
          <Input
            placeholder="Search generations..."
            value={generationSearch}
            onChangeText={setGenerationSearch}
            className="mb-2"
          />
          <ScrollView className="max-h-80">
            {filteredGenerations.map((gen) => (
              <Pressable
                key={gen.id}
                onPress={() => handleSelectGeneration(gen.id)}
                className="border-b border-border py-3"
              >
                <Text className="text-base text-foreground">{gen.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Button
            variant="outline"
            onPress={() => setGenerationOpen(false)}
            className="mt-2"
          >
            <Text>Cancel</Text>
          </Button>
        </SheetContent>
      </Sheet>
    </View>
  );
}
