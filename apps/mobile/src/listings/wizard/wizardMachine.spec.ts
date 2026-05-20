import { describe, it, expect } from "vitest";

import {
  wizardMachineReducer,
  createInitialState,
  buildMachineContext,
  mapLegacyStep,
} from "./wizardMachine";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const validPhoto = { photoId: validUuid, key: "uploads/abc.jpg", sortOrder: 0 };

describe("createInitialState", () => {
  it("returns idle state with empty payload", () => {
    const state = createInitialState();
    expect(state.status).toBe("idle");
    expect(state.draftId).toBeNull();
    expect(state.payload).toEqual({});
    expect(state.validatedSteps).toEqual([]);
  });
});

describe("mapLegacyStep", () => {
  it("maps legacy step 1 to vin", () => {
    expect(mapLegacyStep(1)).toBe("vin");
  });

  it("maps legacy step 3 to vehicle", () => {
    expect(mapLegacyStep(3)).toBe("vehicle");
  });

  it("returns null for undefined", () => {
    expect(mapLegacyStep(undefined)).toBeNull();
  });

  it("maps legacy step 8 to review", () => {
    expect(mapLegacyStep(8)).toBe("review");
  });

  it("returns null for out-of-range steps", () => {
    expect(mapLegacyStep(0)).toBeNull();
    expect(mapLegacyStep(9)).toBeNull();
  });
});

describe("INIT", () => {
  it("transitions from idle to step with draft data", () => {
    const state = createInitialState();
    const next = wizardMachineReducer(state, {
      type: "INIT",
      draftId: "draft-1",
      payload: { vin: "WBA123" },
    });

    expect(next.status).toBe("step");
    expect(next.draftId).toBe("draft-1");
    expect(next.payload).toEqual({ vin: "WBA123" });
    expect(next.currentStep).toBe("vin");
  });

  it("resumes at legacy currentStep when prior steps are validated", () => {
    const state = createInitialState();
    const next = wizardMachineReducer(state, {
      type: "INIT",
      draftId: "draft-1",
      payload: {
        currentStep: 3,
        brandId: validUuid,
        modelId: validUuid,
        year: 2020,
        validatedSteps: ["vin", "photos"],
      },
    });

    expect(next.currentStep).toBe("vehicle");
  });

  it("falls back to first unvalidated step when resuming", () => {
    const state = createInitialState();
    const next = wizardMachineReducer(state, {
      type: "INIT",
      draftId: "draft-1",
      payload: {
        currentStep: 5,
        validatedSteps: ["vin", "photos"],
      },
    });

    // Should resume at vehicle (first unvalidated step), not price
    expect(next.currentStep).toBe("vehicle");
  });

  it("restores validatedSteps from payload", () => {
    const state = createInitialState();
    const next = wizardMachineReducer(state, {
      type: "INIT",
      draftId: "draft-1",
      payload: { validatedSteps: ["vin", "photos"] },
    });

    expect(next.validatedSteps).toEqual(["vin", "photos"]);
  });
});

describe("NEXT", () => {
  it("advances from vin to photos when vin is valid", () => {
    const state = createInitialState();
    const initialized = wizardMachineReducer(state, {
      type: "INIT",
      draftId: "draft-1",
      payload: {},
    });

    const next = wizardMachineReducer(initialized, { type: "NEXT" });
    expect(next.currentStep).toBe("photos");
    expect(next.validatedSteps).toContain("vin");
  });

  it("advances through all steps to review", () => {
    let state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {
        photos: [validPhoto],
        brandId: validUuid,
        modelId: validUuid,
        year: 2020,
        condition: "new",
        priceAmount: 100000,
        priceCurrency: "TMT",
        regionId: validUuid,
        cityId: validUuid,
        description: "Great car",
        allowCalls: true,
        allowChat: true,
      },
    });

    // Advance through all 7 data steps
    for (let i = 0; i < 7; i++) {
      state = wizardMachineReducer(state, { type: "NEXT" });
    }

    expect(state.currentStep).toBe("review");
    expect(state.validatedSteps).toHaveLength(7);
  });

  it("does not advance if current step is invalid", () => {
    // Start on vehicle step with incomplete data
    const state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {
        brandId: validUuid, // missing modelId and year
        currentStep: 3,
        validatedSteps: ["vin", "photos"],
      },
    });

    expect(state.currentStep).toBe("vehicle");

    const next = wizardMachineReducer(state, { type: "NEXT" });
    expect(next.currentStep).toBe("vehicle");
  });

  it("does nothing when not in step status", () => {
    const state = createInitialState();
    const next = wizardMachineReducer(state, { type: "NEXT" });
    expect(next.status).toBe("idle");
  });
});

describe("BACK", () => {
  it("goes back from photos to vin", () => {
    let state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {},
    });
    state = wizardMachineReducer(state, { type: "NEXT" }); // to photos

    const back = wizardMachineReducer(state, { type: "BACK" });
    expect(back.currentStep).toBe("vin");
  });

  it("does not go back from vin", () => {
    const state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {},
    });

    const back = wizardMachineReducer(state, { type: "BACK" });
    expect(back.currentStep).toBe("vin");
  });
});

describe("UPDATE_FIELDS", () => {
  it("updates payload fields", () => {
    const state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {},
    });

    const next = wizardMachineReducer(state, {
      type: "UPDATE_FIELDS",
      updates: { vin: "WBA123" },
    });

    expect(next.payload.vin).toBe("WBA123");
  });

  it("invalidates downstream steps when brand changes", () => {
    const state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {
        brandId: "old-brand",
        modelId: "old-model",
        year: 2020,
        validatedSteps: ["vin", "photos", "vehicle", "specs"],
      },
    });

    const next = wizardMachineReducer(state, {
      type: "UPDATE_FIELDS",
      updates: { brandId: "new-brand" },
    });

    expect(next.validatedSteps).toEqual(["vin", "photos"]);
  });

  it("does not invalidate steps when metadata changes", () => {
    const state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {
        validatedSteps: ["vin", "photos"],
      },
    });

    const next = wizardMachineReducer(state, {
      type: "UPDATE_FIELDS",
      updates: { currentStep: 3, validatedSteps: ["vin", "photos"] },
    });

    expect(next.validatedSteps).toEqual(["vin", "photos"]);
  });
});

describe("GO_TO_STEP", () => {
  it("allows going backward to any step", () => {
    let state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {},
    });
    state = wizardMachineReducer(state, { type: "NEXT" }); // photos
    state = wizardMachineReducer(state, { type: "NEXT" }); // vehicle

    const back = wizardMachineReducer(state, {
      type: "GO_TO_STEP",
      step: "vin",
    });
    expect(back.currentStep).toBe("vin");
  });

  it("allows going forward if dependencies are valid", () => {
    const state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {
        photos: [validPhoto],
        validatedSteps: ["vin", "photos"],
      },
    });

    const next = wizardMachineReducer(state, {
      type: "GO_TO_STEP",
      step: "vehicle",
    });
    expect(next.currentStep).toBe("vehicle");
  });

  it("blocks going forward if dependencies are not valid", () => {
    const state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {
        validatedSteps: ["vin"], // photos not validated
      },
    });

    const next = wizardMachineReducer(state, {
      type: "GO_TO_STEP",
      step: "vehicle",
    });
    expect(next.currentStep).toBe("vin"); // stayed on vin
  });

  it("allows going to review only when all steps valid", () => {
    const state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {
        validatedSteps: ["vin", "photos", "vehicle", "specs", "price", "location", "contact"],
      },
    });

    const next = wizardMachineReducer(state, {
      type: "GO_TO_STEP",
      step: "review",
    });
    expect(next.currentStep).toBe("review");
  });

  it("blocks going to review when not all steps valid", () => {
    const state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {
        validatedSteps: ["vin", "photos"],
      },
    });

    const next = wizardMachineReducer(state, {
      type: "GO_TO_STEP",
      step: "review",
    });
    expect(next.currentStep).toBe("vin");
  });
});

describe("SAVE lifecycle", () => {
  it("transitions to saving then step on success", () => {
    let state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: { vin: "WBA123" },
    });

    state = wizardMachineReducer(state, { type: "SAVE_START" });
    expect(state.status).toBe("saving");

    state = wizardMachineReducer(state, {
      type: "SAVE_SUCCESS",
      payload: { vin: "WBA123", validatedSteps: ["vin"] },
    });
    expect(state.status).toBe("step");
  });

  it("transitions to saveError on failure", () => {
    let state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {},
    });

    state = wizardMachineReducer(state, { type: "SAVE_START" });
    state = wizardMachineReducer(state, {
      type: "SAVE_ERROR",
      error: "Network error",
    });

    expect(state.status).toBe("saveError");
    expect(state.saveError).toBe("Network error");
  });

  it("retries save from saveError", () => {
    let state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {},
    });

    state = wizardMachineReducer(state, { type: "SAVE_START" });
    state = wizardMachineReducer(state, { type: "SAVE_ERROR", error: "fail" });
    state = wizardMachineReducer(state, { type: "SAVE_RETRY" });

    expect(state.status).toBe("saving");
    expect(state.saveError).toBeNull();
  });
});

describe("PUBLISH lifecycle", () => {
  it("transitions to complete on success", () => {
    let state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {},
    });

    state = wizardMachineReducer(state, { type: "PUBLISH_START" });
    expect(state.status).toBe("publishing");

    state = wizardMachineReducer(state, {
      type: "PUBLISH_SUCCESS",
      listingId: "listing-1",
    });
    expect(state.status).toBe("complete");
    expect(state.completedListingId).toBe("listing-1");
  });

  it("transitions to publishError on failure", () => {
    let state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {},
    });

    state = wizardMachineReducer(state, { type: "PUBLISH_START" });
    state = wizardMachineReducer(state, {
      type: "PUBLISH_ERROR",
      error: "Publish failed",
    });

    expect(state.status).toBe("publishError");
    expect(state.publishError).toBe("Publish failed");
  });
});

describe("DISCARD", () => {
  it("resets to initial state", () => {
    let state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: { vin: "WBA123" },
    });

    state = wizardMachineReducer(state, { type: "DISCARD" });
    expect(state.status).toBe("idle");
    expect(state.draftId).toBeNull();
    expect(state.payload).toEqual({});
  });
});

describe("buildMachineContext", () => {
  it("computes canContinue correctly", () => {
    const state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {},
    });

    const ctx = buildMachineContext(state);
    expect(ctx.canContinue).toBe(true); // vin step is always valid
    expect(ctx.canGoBack).toBe(false);
    expect(ctx.isLastStep).toBe(false);
    expect(ctx.stepErrors).toEqual([]);
    expect(ctx.stepNumber).toBe(1);
    expect(ctx.stepCount).toBe(8);
    expect(ctx.progressPercent).toBe(12.5);
  });

  it("reports fieldErrors keyed by field path", () => {
    const state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {
        currentStep: 3,
        validatedSteps: ["vin", "photos"],
      },
    });

    expect(state.currentStep).toBe("vehicle");

    const ctx = buildMachineContext(state);
    expect(ctx.fieldErrors.brandId).toBe("Brand is required");
    expect(ctx.fieldErrors.modelId).toBe("Model is required");
    expect(ctx.fieldErrors.year).toBe("Year is required");
  });

  it("computes canPublish only on review with all steps valid", () => {
    const state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {
        validatedSteps: ["vin", "photos", "vehicle", "specs", "price", "location", "contact"],
      },
    });

    const atReview = wizardMachineReducer(state, {
      type: "GO_TO_STEP",
      step: "review",
    });

    const ctx = buildMachineContext(atReview);
    expect(ctx.canPublish).toBe(true);
    expect(ctx.isLastStep).toBe(true);
    expect(ctx.progressPercent).toBe(100);
  });

  it("reports step errors for invalid step", () => {
    const state = wizardMachineReducer(createInitialState(), {
      type: "INIT",
      draftId: "draft-1",
      payload: {
        brandId: validUuid, // missing modelId and year
        currentStep: 3,
        validatedSteps: ["vin", "photos"],
      },
    });

    expect(state.currentStep).toBe("vehicle");

    const ctx = buildMachineContext(state);
    expect(ctx.canContinue).toBe(false);
    expect(ctx.stepErrors.length).toBeGreaterThan(0);
  });
});
