import { StyleSheet } from "react-native";
import { describe, expect, it } from "vitest";
import { act, fireEvent, renderMobile, routerMock } from "../../../test/render";
import { HomeHeader } from "./HomeHeader";
import { server } from "../../../test/msw";
import { http, HttpResponse } from "msw";
describe("Home See all press feedback", () => {
  it("returns to a plain label after pressing and opening Results", async () => {
    server.use(http.get("http://localhost:3006/api/v1/listings/count", () => HttpResponse.json({ totalMatching: 4 })));
    const screen = renderMobile(<HomeHeader />);
    const button = screen.getByRole("button", { name: "See all" });
    // Pressable applies this native style callback at each responder state.
    const styleFor = (pressed: boolean) => StyleSheet.flatten(typeof button.props.style === "function" ? button.props.style({ pressed }) : button.props.style);
    expect(styleFor(true)).toMatchObject({ backgroundColor: "transparent", opacity: 0.6 });
    await act(async () => { fireEvent.press(button); });
    expect(routerMock.push).toHaveBeenCalledWith("/(tabs)/(search)/results");
    expect(styleFor(false)).toMatchObject({ backgroundColor: "transparent", opacity: 1 });
    expect(screen.getByText("See all")).toBeTruthy();
  });
});
