import { Enums, WizardSchemas } from "@auto-tm/contracts";

import type { PublishFailure } from "./publishFailure";

const {
  WIZARD_STEPS,
  validateStep,
  getStepDependencies,
  getInvalidatedSteps,
} = WizardSchemas;

export type WizardMachineStep = WizardSchemas.WizardStep;

export type WizardMachineStatus =
  | "idle"
  | "loading"
  | "step"
  | "publishing"
  | "publishError"
  | "complete";

export interface WizardMachineState {
  status: WizardMachineStatus;
  draftId: string | null;
  listingId: string | null;
  mode: "create" | "edit";
  editEntryAtReview: boolean;
  /**
   * A step was opened from Check and publish, or from an edit's section list. The
   * step shows Done in place of Continue, and Done or Back returns there.
   */
  changingFromReview: boolean;
  currentStep: WizardMachineStep;
  payload: WizardSchemas.WizardDraftPayload;
  validatedSteps: WizardSchemas.WizardStep[];
  saveError: string | null;
  publishError: PublishFailure | null;
  completedListingId: string | null;
}

export interface WizardMachineContext {
  state: WizardMachineState;
  canContinue: boolean;
  canPublish: boolean;
  canGoBack: boolean;
  editDetourActive: boolean;
  stepErrors: string[];
  fieldErrors: Record<string, string>;
  isLastStep: boolean;
  progressPercent: number;
  stepNumber: number;
  stepCount: number;
}

// ── Actions ──

export type WizardMachineAction =
  | {
      type: "INIT";
      draftId: string | null;
      listingId?: string | null;
      payload: WizardSchemas.WizardDraftPayload;
      mode?: "create" | "edit";
      entryStep?: WizardMachineStep;
    }
  | { type: "NEXT" }
  | { type: "BACK" }
  | {
      type: "UPDATE_FIELDS";
      updates: Partial<WizardSchemas.WizardDraftPayload>;
      /**
       * The update restores what the seller already had (photos back from
       * staging), so completed steps stay completed while they are still valid.
       */
      keepValidSteps?: boolean;
    }
  | { type: "GO_TO_STEP"; step: WizardMachineStep }
  /**
   * Open a step from Check and publish or from an edit's section list, to come
   * back with Done. An edit never opens Car: it is locked after publishing (ADR-0024).
   */
  | { type: "CHANGE_FROM_REVIEW"; step: WizardMachineStep }
  /** Done on a step opened with CHANGE_FROM_REVIEW. */
  | { type: "RETURN_TO_REVIEW" }
  | { type: "PUBLISH_START" }
  /**
   * Nothing was published and there is no publish failure to word: back to Check.
   * The save before publishing failed, or the server asked for the contact phone
   * to be confirmed (#593), which the route follows with CHANGE_FROM_REVIEW.
   */
  | { type: "PUBLISH_ABORTED" }
  | { type: "PUBLISH_SUCCESS"; listingId: string }
  | { type: "PUBLISH_ERROR"; error: PublishFailure }
  | { type: "DISCARD" };

// ── Helpers ──

function stepIndex(step: WizardMachineStep): number {
  return WIZARD_STEPS.indexOf(step);
}

function getStepAtIndex(index: number): WizardMachineStep {
  const clamped = Math.max(0, Math.min(index, WIZARD_STEPS.length - 1));
  return WIZARD_STEPS[clamped] ?? "vehicle";
}

/** VIN is locked after publication; legacy values must not block unrelated edits. */
function validationPayload(
  payload: WizardSchemas.WizardDraftPayload,
  mode: WizardMachineState["mode"],
): WizardSchemas.WizardDraftPayload {
  return mode === "edit" ? { ...payload, vin: undefined } : payload;
}

function isStepValid(
  step: WizardSchemas.WizardStep,
  payload: WizardSchemas.WizardDraftPayload,
): boolean {
  return validateStep(step, payload).valid;
}

/** Data steps are every step except the trailing review summary. */
const DATA_STEPS: WizardSchemas.WizardStep[] = WIZARD_STEPS.filter(
  (s) => s !== "review",
);

function computeValidatedSteps(
  payload: WizardSchemas.WizardDraftPayload,
  previouslyValidated: WizardSchemas.WizardStep[],
  mode: WizardMachineState["mode"] = "create",
): WizardSchemas.WizardStep[] {
  return previouslyValidated.filter((step) => isStepValid(step, validationPayload(payload, mode)));
}

/**
 * Completion comes from the saved fields, not from stored step names, so a
 * draft saved by the eight-step wizard (whose names and order differ) resumes
 * correctly: every data step whose schema passes counts as complete.
 */
export function completedSteps(
  payload: WizardSchemas.WizardDraftPayload,
  mode: WizardMachineState["mode"] = "create",
): WizardSchemas.WizardStep[] {
  return DATA_STEPS.filter((step) => isStepValid(step, validationPayload(payload, mode)));
}

/**
 * The step the seller left, from the payload's `currentStep` (a position, 1 to 7).
 * Earlier wizards wrote 1 once and never updated it, and the eight-step wizard
 * could write 8, so 1 and anything out of range mean "not recorded" and the
 * draft resumes at its first incomplete step.
 */
function savedStep(payload: WizardSchemas.WizardDraftPayload): WizardMachineStep | null {
  const position = payload.currentStep;
  if (position === undefined || !Number.isInteger(position)) return null;
  if (position < 2 || position > WIZARD_STEPS.length) return null;
  return WIZARD_STEPS[position - 1] ?? null;
}

/** The payload a new Listing's draft starts with, apart from the step bookkeeping. */
const NEW_DRAFT_DEFAULTS: Record<string, unknown> = {
  condition: Enums.ListingCondition.Used,
  allowCalls: true,
  allowChat: true,
  priceCurrency: "TMT",
};

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true;
  if (Array.isArray(value)) return value.every(isEmptyValue);
  if (typeof value === "object") return Object.values(value).every(isEmptyValue);
  return false;
}

/**
 * True while the seller has not changed anything from what tapping New listing
 * created: every field is empty or still at its starting value. A field that was
 * changed and cleared again counts as untouched.
 */
export function isUntouchedPayload(payload: WizardSchemas.WizardDraftPayload): boolean {
  return Object.entries(payload).every(([key, value]) => {
    if (key === "currentStep" || key === "validatedSteps") return true;
    if (key in NEW_DRAFT_DEFAULTS) {
      return value === undefined || value === NEW_DRAFT_DEFAULTS[key];
    }
    return isEmptyValue(value);
  });
}

/**
 * Moves to a step. A create draft records the position in its payload so the
 * autosave sends it and a later resume opens there; an edit has no draft.
 */
function moveTo(
  state: WizardMachineState,
  step: WizardMachineStep,
): Pick<WizardMachineState, "currentStep" | "payload"> {
  return {
    currentStep: step,
    payload:
      state.mode === "create"
        ? { ...state.payload, currentStep: stepIndex(step) + 1 }
        : state.payload,
  };
}

/**
 * Ends a change that began on Check and publish. A changed field reset the steps
 * after its own, so completion is read from the fields again, as on resume: the
 * steps the change left valid are complete, and Check names the others.
 */
function backToReview(state: WizardMachineState): WizardMachineState {
  return {
    ...state,
    ...moveTo(state, "review"),
    changingFromReview: false,
    validatedSteps: completedSteps(state.payload, state.mode),
    saveError: null,
  };
}

// ── Initial state ──

export function createInitialState(): WizardMachineState {
  return {
    status: "idle",
    draftId: null,
    listingId: null,
    mode: "create",
    editEntryAtReview: false,
    changingFromReview: false,
    currentStep: "vehicle",
    payload: {},
    validatedSteps: [],
    saveError: null,
    publishError: null,
    completedListingId: null,
  };
}

// ── Reducer ──

export function wizardMachineReducer(
  state: WizardMachineState,
  action: WizardMachineAction,
): WizardMachineState {
  switch (action.type) {
    case "INIT": {
      const mode = action.mode ?? "create";
      const payload =
        mode === "create"
          ? {
              ...action.payload,
              condition: action.payload.condition ?? Enums.ListingCondition.Used,
              ...(action.payload.condition === Enums.ListingCondition.New &&
                action.payload.conditionDisclosure?.damaged === undefined && {
                  conditionDisclosure: { ...action.payload.conditionDisclosure, damaged: false },
                }),
            }
          : action.payload;
      const validatedSteps = completedSteps(payload, mode);

      if (mode === "edit" && action.entryStep === "review") {
        // ADR-0080: a New Listing is not asked Damaged, so it needs no answer here.
        const needsDamagedAnswer =
          payload.condition !== Enums.ListingCondition.New &&
          payload.conditionDisclosure?.damaged === undefined;
        return {
          ...state,
          status: "step",
          draftId: action.draftId,
          listingId: action.listingId ?? null,
          mode,
          editEntryAtReview: true,
          // Opened on Details for the missing answer: Done and Back lead to the list.
          changingFromReview: needsDamagedAnswer,
          payload,
          validatedSteps: DATA_STEPS,
          currentStep: needsDamagedAnswer ? "specs" : "review",
          saveError: null,
          publishError: null,
        };
      }

      // Resume at the first incomplete step up to the entry step; with no
      // entry step, at the first incomplete step or at review when all are done.
      // A create draft that recorded the step the seller left opens there, but
      // never past the first incomplete step, because later steps depend on it.
      const target: WizardMachineStep = action.entryStep ?? "review";
      const firstIncomplete =
        WIZARD_STEPS.slice(0, stepIndex(target)).find(
          (step) => !validatedSteps.includes(step),
        ) ?? target;
      const left = mode === "create" && !action.entryStep ? savedStep(payload) : null;
      const resumeStep =
        left && stepIndex(left) < stepIndex(firstIncomplete) ? left : firstIncomplete;

      return {
        ...state,
        status: "step",
        draftId: action.draftId,
        listingId: action.listingId ?? null,
        mode,
        editEntryAtReview: false,
        changingFromReview: false,
        // A create draft records the step it opens at, like every later move.
        payload:
          mode === "create"
            ? { ...payload, currentStep: stepIndex(resumeStep) + 1 }
            : payload,
        validatedSteps,
        currentStep: resumeStep,
        saveError: null,
        publishError: null,
      };
    }

    case "NEXT": {
      if (state.status !== "step") return state;

      const currentIdx = stepIndex(state.currentStep);
      const isLast = currentIdx >= WIZARD_STEPS.length - 1;

      // Review has no fields of its own; advancing FROM review means Publish,
      // which is handled by handlePublish, not NEXT.
      if (state.currentStep === "review") return state;

      const validation = validateStep(state.currentStep, validationPayload(state.payload, state.mode));
      if (!validation.valid) {
        return { ...state, status: "step" };
      }

      const newValidated = state.validatedSteps.includes(state.currentStep)
        ? state.validatedSteps
        : [...state.validatedSteps, state.currentStep];

      if (isLast) {
        return { ...state, validatedSteps: newValidated, saveError: null };
      }

      return {
        ...state,
        ...moveTo(state, getStepAtIndex(currentIdx + 1)),
        validatedSteps: newValidated,
        saveError: null,
      };
    }

    case "BACK": {
      // A failed publish leaves the seller on Check, and Back still works there.
      if (state.status !== "step" && state.status !== "publishError") return state;
      // Back from a step opened on Check returns to Check, valid or not: Check
      // then names the step as one to fill in.
      if (state.changingFromReview) return backToReview(state);
      const currentIdx = stepIndex(state.currentStep);
      if (currentIdx <= 0) return state;
      return {
        ...state,
        ...moveTo(state, getStepAtIndex(currentIdx - 1)),
        status: "step",
        saveError: null,
        publishError: null,
      };
    }

    case "UPDATE_FIELDS": {
      const newPayload = { ...state.payload, ...action.updates };

      const changedFields = Object.keys(action.updates).filter(
        (key) =>
          key !== "validatedSteps" &&
          key !== "currentStep" &&
          JSON.stringify(state.payload[key as keyof typeof state.payload]) !==
            JSON.stringify(action.updates[key as keyof typeof action.updates]),
      );

      if (changedFields.length === 0) {
        return state;
      }

      const invalidated = getInvalidatedSteps(changedFields);

      const newValidatedSteps =
        state.mode === "edit"
          ? computeValidatedSteps(newPayload, DATA_STEPS, state.mode)
          : action.keepValidSteps
            ? computeValidatedSteps(newPayload, state.validatedSteps)
            : state.validatedSteps.filter((s) => !invalidated.includes(s));

      return {
        ...state,
        payload: newPayload,
        validatedSteps: newValidatedSteps,
        saveError: null,
      };
    }

    case "GO_TO_STEP": {
      if (state.status !== "step") return state;

      const targetIdx = stepIndex(action.step);
      const currentIdx = stepIndex(state.currentStep);

      // Always allow going backward
      if (targetIdx < currentIdx) {
        return { ...state, ...moveTo(state, action.step), saveError: null };
      }

      // Going forward: target's dependencies must all be validated
      const deps = getStepDependencies(action.step);
      const allDepsValid = deps.every((d) => state.validatedSteps.includes(d));
      if (!allDepsValid) return state;

      return { ...state, ...moveTo(state, action.step), saveError: null };
    }

    case "CHANGE_FROM_REVIEW": {
      // Also after a failed publish, which leaves the seller on Check.
      if (state.status !== "step" && state.status !== "publishError") return state;
      if (state.currentStep !== "review" || action.step === "review") return state;
      if (state.mode === "edit" && action.step === "vehicle") return state;
      return {
        ...state,
        ...moveTo(state, action.step),
        status: "step",
        changingFromReview: true,
        saveError: null,
        publishError: null,
      };
    }

    case "RETURN_TO_REVIEW": {
      if (state.status !== "step" || !state.changingFromReview) return state;
      if (!isStepValid(state.currentStep, validationPayload(state.payload, state.mode))) return state;
      return backToReview(state);
    }

    case "PUBLISH_START": {
      // A failed publish leaves the seller on Check, where it can be tried again.
      if (state.status !== "step" && state.status !== "publishError") return state;
      return { ...state, status: "publishing", publishError: null };
    }

    case "PUBLISH_ABORTED": {
      // The save status or the Contact step says what went wrong; there is no publish error.
      if (state.status !== "publishing") return state;
      return { ...state, status: "step", publishError: null };
    }

    case "PUBLISH_SUCCESS": {
      if (state.status !== "publishing") return state;
      return {
        ...state,
        status: "complete",
        completedListingId: action.listingId,
        publishError: null,
      };
    }

    case "PUBLISH_ERROR": {
      if (state.status !== "publishing") return state;
      return { ...state, status: "publishError", publishError: action.error };
    }

    case "DISCARD": {
      return createInitialState();
    }

    default:
      return state;
  }
}

// ── Selectors ──

export function buildMachineContext(
  state: WizardMachineState,
): WizardMachineContext {
  const currentIdx = stepIndex(state.currentStep);
  const isLastStep = state.currentStep === "review";
  const editDetourActive =
    (state.mode === "edit" && !isLastStep) || (state.changingFromReview && !isLastStep);

  const validation = validateStep(state.currentStep, validationPayload(state.payload, state.mode));

  // Continue is enabled when the current step's fields are valid.
  // On review, Continue is irrelevant — Publish is the action.
  const canContinue = isLastStep ? false : validation.valid;

  // Publish requires all DATA steps validated (review has no fields of its own).
  const canPublish =
    isLastStep && DATA_STEPS.every((s) => state.validatedSteps.includes(s));

  const canGoBack =
    state.mode === "edit"
      ? // An edit has no step order: Back only leaves a step opened from the list.
        state.changingFromReview && !isLastStep && state.status === "step"
      : // The first step has a Back too when it was opened from Check.
        (currentIdx > 0 || state.changingFromReview) &&
        (state.status === "step" || state.status === "publishError");

  // Position-based progress: where in the wizard am I right now.
  const stepNumber = currentIdx + 1;
  const stepCount = WIZARD_STEPS.length;
  const progressPercent = (stepNumber / stepCount) * 100;

  return {
    state,
    canContinue,
    canPublish,
    canGoBack,
    editDetourActive,
    stepErrors: validation.errors,
    fieldErrors: validation.fieldErrors,
    isLastStep,
    progressPercent,
    stepNumber,
    stepCount,
  };
}
