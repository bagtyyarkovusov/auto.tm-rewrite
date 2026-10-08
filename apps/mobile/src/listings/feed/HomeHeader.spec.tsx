import { StyleSheet } from "react-native";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { act, fireEvent, renderMobile, routerMock } from "../../../test/render";
import { server } from "../../../test/msw";

import { HomeHeader } from "./HomeHeader";

describe("Home See all press feedback", () => {
  it("returns to a plain label after release, cancellation and opening Results", async () => {
    server.use(http.get("http://localhost:3006/api/v1/listings/count", () => HttpResponse.json({ totalMatching: 4 })));
    const screen = renderMobile(<HomeHeader />);
    const button = screen.getByRole("button", { name: "See all" });
    const style = () => StyleSheet.flatten(button.props.style);
    fireEvent(button, "pressIn");
    expect(style()).toMatchObject({ backgroundColor: "transparent", opacity: 0.6 });
    fireEvent(button, "pressOut");
    expect(style()).toMatchObject({ backgroundColor: "transparent", opacity: 1 });
    fireEvent(button, "pressIn");
    await act(async () => { fireEvent.press(button); });
    expect(routerMock.push).toHaveBeenCalledWith("/(tabs)/(search)/results");
    expect(style()).toMatchObject({ backgroundColor: "transparent", opacity: 1 });
    expect(screen.getByText("See all")).toBeTruthy();
  });
});
