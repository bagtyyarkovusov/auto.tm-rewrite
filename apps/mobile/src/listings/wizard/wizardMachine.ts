import { WizardSchemas } from "@auto-tm/contracts";

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
  | "saving"
  | "saveError"
  | "publishing"
  | "publishError"
  | "complete";

export interface WizardMachineState {
  status: WizardMachineStatus;
  draftId: string | null;
  currentStep: WizardMachineStep;
  payload: WizardSchemas.WizardDraftPayload;
  validatedSteps: WizardSchemas.WizardStep[];
  saveError: string | null;
  publishError: string | null;
  completedListingId: string | null;
}

export interface WizardMachineContext {
  state: WizardMachineState;
  canContinue: boolean;
  canPublish: boolean;
  canGoBack: boolean;
  stepErrors: string[];
  fieldErrors: Record<string, string>;
  isLastStep: boolean;
  progressPercent: number;
  stepNumber: number;
  stepCount: number;
}

// ── Actions ──

export type WizardMachineAction =
  | { type: "INIT"; draftId: string; payload: WizardSchemas.WizardDraftPayload }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "UPDATE_FIELDS"; updates: Partial<WizardSchemas.WizardDraftPayload> }
  | { type: "GO_TO_STEP"; step: WizardMachineStep }
  | { type: "SAVE_START" }
  | { type: "SAVE_SUCCESS"; payload: WizardSchemas.WizardDraftPayload }
  | { type: "SAVE_ERROR"; error: string }
  | { type: "SAVE_RETRY" }
  | { type: "PUBLISH_START" }
  | { type: "PUBLISH_SUCCESS"; listingId: string }
  | { type: "PUBLISH_ERROR"; error: string }
  | { type: "DISCARD" };

// ── Helpers ──

function stepIndex(step: WizardMachineStep): number {
  return WIZARD_STEPS.indexOf(step);
}

function getStepAtIndex(index: number): WizardMachineStep {
  const clamped = Math.max(0, Math.min(index, WIZARD_STEPS.length - 1));
  return WIZARD_STEPS[clamped] ?? "vin";
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
): WizardSchemas.WizardStep[] {
  return previouslyValidated.filter((step) => isStepValid(step, payload));
}

/**
 * Map legacy numeric currentStep (1-7) to WizardStep names.
 * Returns null if the input is not a valid legacy step.
 */
export function mapLegacyStep(
  legacyStep: number | undefined,
): WizardSchemas.WizardStep | null {
  if (typeof legacyStep !== "number") return null;
  const idx = legacyStep - 1;
  if (idx < 0 || idx >= WIZARD_STEPS.length) return null;
  return WIZARD_STEPS[idx] ?? null;
}

// ── Initial state ──

export function createInitialState(): WizardMachineState {
  return {
    status: "idle",
    draftId: null,
    currentStep: "vin",
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
      const legacyStep = mapLegacyStep(action.payload.currentStep);
      const validatedSteps =
        action.payload.validatedSteps && Array.isArray(action.payload.validatedSteps)
          ? action.payload.validatedSteps.filter((s): s is WizardSchemas.WizardStep =>
              WIZARD_STEPS.includes(s as WizardSchemas.WizardStep),
            )
          : [];

      // Resume at the step indicated by the draft, or the first unvalidated data step
      let resumeStep: WizardMachineStep = legacyStep ?? "vin";
      const resumeIdx = stepIndex(resumeStep);
      for (let i = 0; i <= resumeIdx; i++) {
        const step = getStepAtIndex(i);
        if (step === "review") break;
        if (!validatedSteps.includes(step)) {
          resumeStep = step;
          break;
        }
      }

      return {
        ...state,
        status: "step",
        draftId: action.draftId,
        payload: action.payload,
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

      const validation = validateStep(state.currentStep, state.payload);
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
        currentStep: getStepAtIndex(currentIdx + 1),
        validatedSteps: newValidated,
        saveError: null,
      };
    }

    case "BACK": {
      if (state.status !== "step") return state;
      const currentIdx = stepIndex(state.currentStep);
      if (currentIdx <= 0) return state;
      return {
        ...state,
        currentStep: getStepAtIndex(currentIdx - 1),
        saveError: null,
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

      const invalidated =
        changedFields.length > 0 ? getInvalidatedSteps(changedFields) : [];

      const newValidatedSteps = state.validatedSteps.filter(
        (s) => !invalidated.includes(s),
      );

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
        return { ...state, currentStep: action.step, saveError: null };
      }

      // Going forward: target's dependencies must all be validated
      const deps = getStepDependencies(action.step);
      const allDepsValid = deps.every((d) => state.validatedSteps.includes(d));
      if (!allDepsValid) return state;

      return { ...state, currentStep: action.step, saveError: null };
    }

    case "SAVE_START": {
      if (state.status !== "step" && state.status !== "saveError") return state;
      return { ...state, status: "saving", saveError: null };
    }

    case "SAVE_SUCCESS": {
      if (state.status !== "saving") return state;
      return {
        ...state,
        status: "step",
        payload: action.payload,
        validatedSteps: computeValidatedSteps(
          action.payload,
          state.validatedSteps,
        ),
        saveError: null,
      };
    }

    case "SAVE_ERROR": {
      if (state.status !== "saving") return state;
      return { ...state, status: "saveError", saveError: action.error };
    }

    case "SAVE_RETRY": {
      if (state.status !== "saveError") return state;
      return { ...state, status: "saving", saveError: null };
    }

    case "PUBLISH_START": {
      if (state.status !== "step") return state;
      return { ...state, status: "publishing", publishError: null };
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

  const validation = validateStep(state.currentStep, state.payload);

  // Continue is enabled when the current step's fields are valid.
  // On review, Continue is irrelevant — Publish is the action.
  const canContinue = isLastStep ? false : validation.valid;

  // Publish requires all DATA steps validated (review has no fields of its own).
  const canPublish =
    isLastStep && DATA_STEPS.every((s) => state.validatedSteps.includes(s));

  const canGoBack = currentIdx > 0 && state.status === "step";

  // Position-based progress: where in the wizard am I right now.
  const stepNumber = currentIdx + 1;
  const stepCount = WIZARD_STEPS.length;
  const progressPercent = (stepNumber / stepCount) * 100;

  return {
    state,
    canContinue,
    canPublish,
    canGoBack,
    stepErrors: validation.errors,
    fieldErrors: validation.fieldErrors,
    isLastStep,
    progressPercent,
    stepNumber,
    stepCount,
  };
}
