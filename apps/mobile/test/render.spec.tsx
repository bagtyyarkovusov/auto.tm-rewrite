import { useState } from "react";
import { View, TextInput } from "react-native";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it } from "vitest";

import { Button } from "../components/ui/button";
import { Text } from "../components/ui/text";
import { renderMobile } from "./render";

function Example() {
  const { t } = useTranslation();
  const [pressed, setPressed] = useState(false);
  const { data } = useQuery({ queryKey: ["example"], queryFn: async () => "Loaded" });
  return <View className="gap-3"><TextInput accessibilityLabel="Name" />
    <Button onPress={() => setPressed(true)}><Text>{t("save")}</Text></Button>
    {pressed && <Text>Saved</Text>}{data && <Text>{data}</Text>}
  </View>;
}

describe("mobile renderer", () => {
  it("queries native roles, labels and translated text and presses a real component", async () => {
    const screen = renderMobile(<Example />);
    expect(screen.getByLabelText("Name")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Saved")).toBeTruthy();
    expect(await screen.findByText("Loaded")).toBeTruthy();
  });
});
