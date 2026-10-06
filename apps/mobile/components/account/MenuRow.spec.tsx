import { describe, expect, it } from "vitest";

import { renderMobile } from "../../test/render";

import { MenuRow } from "./MenuRow";

const LABEL = "Toyota Land Cruiser Prado, 2021";

describe("MenuRow", () => {
  it("lets a large label wrap unless the row asks for one line", () => {
    const view = renderMobile(<MenuRow size="large" label={LABEL} onPress={() => undefined} />);
    expect(view.getByText(LABEL).props.numberOfLines).toBeUndefined();
  });

  it("keeps the label on one line when the row asks for it", () => {
    const view = renderMobile(<MenuRow size="large" singleLineLabel label={LABEL} onPress={() => undefined} />);
    expect(view.getByText(LABEL).props.numberOfLines).toBe(1);
  });
});
