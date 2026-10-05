import { describe, expect, it } from "vitest";

import {
  buildMachineContext,
  createInitialState,
  wizardMachineReducer,
  type WizardMachineState,
} from "./wizardMachine";

const id = "550e8400-e29b-41d4-a716-446655440000";
const completePayload = {
  photos: [{ photoId: id, key: "uploads/abc.jpg", sortOrder: 0 }],
  brandId: id, modelId: id, year: 2020,
  condition: "used" as const, mileageKm: 10000, conditionDisclosure: { damaged: false },
  priceAmount: 100000, priceCurrency: "TMT" as const,
  regionId: id, cityId: id, description: "Great car",
  contactPhone: "+99361234567", allowCalls: true, allowChat: true,
};
const dataSteps = ["vehicle", "specs", "photos", "price", "location", "contact"];

/** A complete create draft, which opens on Check and publish. */
function atCheck(): WizardMachineState {
  const state = wizardMachineReducer(createInitialState(), {
    type: "INIT", draftId: "draft-1", payload: completePayload,
  });
  expect(state.currentStep).toBe("review");
  return state;
}

describe("Changing a step from Check and publish (#588)", () => {
  it("opens the step with Done in place of Continue", () => {
    const changing = wizardMachineReducer(atCheck(), { type: "CHANGE_FROM_REVIEW", step: "price" });

    expect(changing.currentStep).toBe("price");
    expect(changing.payload.currentStep).toBe(4);
    expect(buildMachineContext(changing).editDetourActive).toBe(true);
  });

  it("Done returns to Check, with every step the change left complete still complete", () => {
    let state = wizardMachineReducer(atCheck(), { type: "CHANGE_FROM_REVIEW", step: "price" });
    // A changed price resets the steps after Price, as it does on the way forward.
    state = wizardMachineReducer(state, { type: "UPDATE_FIELDS", updates: { priceAmount: 95000 } });
    expect(state.validatedSteps).not.toContain("contact");

    state = wizardMachineReducer(state, { type: "RETURN_TO_REVIEW" });

    expect(state.currentStep).toBe("review");
    expect(state.payload.currentStep).toBe(7);
    expect(state.payload.priceAmount).toBe(95000);
    expect(state.validatedSteps).toEqual(dataSteps);
    const ctx = buildMachineContext(state);
    expect(ctx.editDetourActive).toBe(false);
    expect(ctx.canPublish).toBe(true);
  });

  it("Done stays on a step that is not valid", () => {
    let state = wizardMachineReducer(atCheck(), { type: "CHANGE_FROM_REVIEW", step: "price" });
    state = wizardMachineReducer(state, { type: "UPDATE_FIELDS", updates: { priceAmount: undefined } });

    const stayed = wizardMachineReducer(state, { type: "RETURN_TO_REVIEW" });

    expect(stayed.currentStep).toBe("price");
    expect(buildMachineContext(stayed).editDetourActive).toBe(true);
  });

  it("Back returns to Check too, and Check then names the step left incomplete", () => {
    let state = wizardMachineReducer(atCheck(), { type: "CHANGE_FROM_REVIEW", step: "price" });
    state = wizardMachineReducer(state, { type: "UPDATE_FIELDS", updates: { priceAmount: undefined } });

    state = wizardMachineReducer(state, { type: "BACK" });

    expect(state.currentStep).toBe("review");
    expect(state.validatedSteps).toEqual(dataSteps.filter((step) => step !== "price"));
    const ctx = buildMachineContext(state);
    expect(ctx.editDetourActive).toBe(false);
    expect(ctx.canPublish).toBe(false);
  });

  it("gives the first step a Back while it is being changed", () => {
    const changing = wizardMachineReducer(atCheck(), { type: "CHANGE_FROM_REVIEW", step: "vehicle" });
    expect(buildMachineContext(changing).canGoBack).toBe(true);

    const back = wizardMachineReducer(changing, { type: "BACK" });
    expect(back.currentStep).toBe("review");
  });

  it("opens a step after a failed publish, and clears the failure", () => {
    let state = wizardMachineReducer(atCheck(), { type: "PUBLISH_START" });
    state = wizardMachineReducer(state, { type: "PUBLISH_ERROR", error: "server" });

    state = wizardMachineReducer(state, { type: "CHANGE_FROM_REVIEW", step: "price" });

    expect(state).toMatchObject({ status: "step", currentStep: "price", publishError: null });
  });

  it("lets a failed publish be tried again from Check", () => {
    let state = wizardMachineReducer(atCheck(), { type: "PUBLISH_START" });
    state = wizardMachineReducer(state, { type: "PUBLISH_ERROR", error: "offline" });
    expect(state).toMatchObject({ status: "publishError", currentStep: "review", publishError: "offline" });
    expect(buildMachineContext(state).canPublish).toBe(true);

    state = wizardMachineReducer(state, { type: "PUBLISH_START" });

    expect(state).toMatchObject({ status: "publishing", publishError: null });
  });

  it("keeps Back after a failed publish, and Back clears the failure", () => {
    let state = wizardMachineReducer(atCheck(), { type: "PUBLISH_START" });
    expect(buildMachineContext(state).canGoBack).toBe(false);
    state = wizardMachineReducer(state, { type: "PUBLISH_ERROR", error: "server" });
    expect(buildMachineContext(state).canGoBack).toBe(true);

    state = wizardMachineReducer(state, { type: "BACK" });

    expect(state).toMatchObject({ status: "step", currentStep: "contact", publishError: null });
  });

  it("is not a detour away from Check: a step reached with Back keeps Continue", () => {
    const state = wizardMachineReducer(atCheck(), { type: "BACK" });

    expect(state.currentStep).toBe("contact");
    expect(buildMachineContext(state).editDetourActive).toBe(false);
    // Neither action does anything outside Check and its detour.
    expect(wizardMachineReducer(state, { type: "CHANGE_FROM_REVIEW", step: "price" })).toBe(state);
    expect(wizardMachineReducer(state, { type: "RETURN_TO_REVIEW" })).toBe(state);
  });

  it("starts each draft without a detour", () => {
    const changing = wizardMachineReducer(atCheck(), { type: "CHANGE_FROM_REVIEW", step: "price" });
    const reopened = wizardMachineReducer(changing, { type: "INIT", draftId: "draft-2", payload: completePayload });

    expect(buildMachineContext(reopened).editDetourActive).toBe(false);
  });
});
