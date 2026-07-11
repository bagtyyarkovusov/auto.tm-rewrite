import { z } from "zod";

import {
  ListingDraftPayloadSchema,
  CurrencySchema,
  ListingConditionSchema,
  DraftPhotoSchema,
  ConditionDisclosureSchema,
} from "./listings";

// ── Wizard step enum ──

export const WizardStepSchema = z.enum([
  "vin",
  "photos",
  "vehicle",
  "specs",
  "price",
  "location",
  "contact",
  "review",
]);
export type WizardStep = z.infer<typeof WizardStepSchema>;

export const WIZARD_STEPS: WizardStep[] = [
  "vin",
  "photos",
  "vehicle",
  "specs",
  "price",
  "location",
  "contact",
  "review",
];

// ── Per-step validation schemas ──
// Each schema validates exactly the fields required for its step.
// They are refinements of ListingDraftPayloadSchema — partial, step-scoped.

export const StepVinSchema = z.object({
  vin: z.string().max(17, "VIN cannot exceed 17 characters").optional(),
});
export type StepVinInput = z.infer<typeof StepVinSchema>;

export const StepPhotosSchema = z.object({
  photos: z
    .array(DraftPhotoSchema)
    .min(1, "At least one photo is required")
    .refine(
      (photos) => photos.some((p) => p.key),
      "Wait for photos to finish uploading",
    ),
});
export type StepPhotosInput = z.infer<typeof StepPhotosSchema>;

const CURRENT_YEAR = new Date().getFullYear();

export const StepVehicleSchema = z.object({
  brandId: z.string({ required_error: "Brand is required" }).uuid({ message: "Brand is required" }),
  modelId: z.string({ required_error: "Model is required" }).uuid({ message: "Model is required" }),
  generationId: z.string().uuid().optional(),
  year: z
    .number({ required_error: "Year is required", invalid_type_error: "Year is required" })
    .int("Year must be a whole number")
    .min(1900, "Year must be 1900 or later")
    .max(CURRENT_YEAR + 1, `Year cannot be later than ${CURRENT_YEAR + 1}`),
});
export type StepVehicleInput = z.infer<typeof StepVehicleSchema>;

export const StepSpecsSchema = z
  .object({
    condition: ListingConditionSchema,
    mileageKm: z.number().int().nonnegative("Mileage must be zero or greater").optional(),
    colorId: z.string().uuid().optional(),
    bodyTypeId: z.string().uuid().optional(),
    transmissionId: z.string().uuid().optional(),
    driveTypeId: z.string().uuid().optional(),
    engineTypeId: z.string().uuid().optional(),
    enginePower: z.number().int().positive("Engine power must be greater than zero").optional(),
    conditionDisclosure: ConditionDisclosureSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.condition === "used") {
        return data.mileageKm !== undefined;
      }
      return true;
    },
    { message: "Mileage is required for used cars", path: ["mileageKm"] },
  );
export type StepSpecsInput = z.infer<typeof StepSpecsSchema>;

export const StepPriceSchema = z.object({
  priceAmount: z
    .number({ required_error: "Price is required", invalid_type_error: "Price is required" })
    .positive("Price must be greater than zero")
    .max(999_999_999, "Price is too large"),
  priceCurrency: CurrencySchema,
  acceptsExchange: z.boolean().optional(),
  installmentAvailable: z.boolean().optional(),
});
export type StepPriceInput = z.infer<typeof StepPriceSchema>;

export const StepLocationSchema = z.object({
  regionId: z.string({ required_error: "Region is required" }).uuid({ message: "Region is required" }),
  cityId: z.string({ required_error: "City is required" }).uuid({ message: "City is required" }),
  locationText: z.string().max(200, "Area must be 200 characters or fewer").optional(),
});
export type StepLocationInput = z.infer<typeof StepLocationSchema>;

export const StepContactSchema = z
  .object({
    description: z
      .string({ required_error: "Description is required" })
      .min(1, "Description is required")
      .max(2000, "Description must be 2000 characters or fewer"),
    contactPhone: z.string().optional(),
    allowCalls: z.boolean(),
    allowChat: z.boolean(),
  })
  .refine(
    (data) => data.allowCalls || data.allowChat,
    {
      message: "Choose calls or chat",
      path: ["allowCalls"],
    },
  );
export type StepContactInput = z.infer<typeof StepContactSchema>;

// Review step is a summary — has no fields of its own. Always validates true;
// the wizard machine guards Publish on all prior steps being validated.
export const StepReviewSchema = z.object({});
export type StepReviewInput = z.infer<typeof StepReviewSchema>;

// ── Step dependency graph ──
// Maps each step to the steps that must be valid before it can be reached.
// Used for navigation gating and invalidation cascading.

const STEP_DEPENDENCIES: Record<WizardStep, WizardStep[]> = {
  vin: [],
  photos: ["vin"],
  vehicle: ["vin", "photos"],
  specs: ["vin", "photos", "vehicle"],
  price: ["vin", "photos", "vehicle", "specs"],
  location: ["vin", "photos", "vehicle", "specs", "price"],
  contact: ["vin", "photos", "vehicle", "specs", "price", "location"],
  review: ["vin", "photos", "vehicle", "specs", "price", "location", "contact"],
};

export function getStepDependencies(step: WizardStep): WizardStep[] {
  return STEP_DEPENDENCIES[step];
}

// ── Step invalidation rules ──
// Maps a changed field to the steps that become invalid when that field changes.
// A field change invalidates its own step and all downstream steps that depend on it.

const FIELD_TO_STEP: Record<string, WizardStep> = {
  vin: "vin",
  photos: "photos",
  brandId: "vehicle",
  modelId: "vehicle",
  generationId: "vehicle",
  year: "vehicle",
  condition: "specs",
  mileageKm: "specs",
  conditionDisclosure: "specs",
  colorId: "specs",
  bodyTypeId: "specs",
  transmissionId: "specs",
  driveTypeId: "specs",
  engineTypeId: "specs",
  enginePower: "specs",
  priceAmount: "price",
  priceCurrency: "price",
  acceptsExchange: "price",
  installmentAvailable: "price",
  regionId: "location",
  cityId: "location",
  locationText: "location",
  description: "contact",
  contactPhone: "contact",
  allowCalls: "contact",
  allowChat: "contact",
};

/**
 * Given a set of changed fields, return the steps that should be invalidated.
 * Includes the step owning each field plus all downstream steps.
 */
export function getInvalidatedSteps(changedFields: string[]): WizardStep[] {
  const affected = new Set<WizardStep>();

  for (const field of changedFields) {
    const step = FIELD_TO_STEP[field];
    if (!step) continue;
    affected.add(step);

    // All steps that depend on this step are also invalidated
    for (const s of WIZARD_STEPS) {
      if (STEP_DEPENDENCIES[s].includes(step)) {
        affected.add(s);
      }
    }
  }

  // Preserve order
  return WIZARD_STEPS.filter((s) => affected.has(s));
}

// ── Step validator ──

export interface StepValidationResult {
  valid: boolean;
  /** Flat list of error messages — kept for API endpoint compatibility. */
  errors: string[];
  /**
   * First error per field, keyed by the Zod issue's top-level path segment.
   * Mobile UI consumes this to render inline errors directly under each field.
   * Schema-level issues with no path land under the empty-string key.
   */
  fieldErrors: Record<string, string>;
}

/**
 * Validate a single wizard step against a draft payload.
 * Returns client-side validation result (no server calls).
 */
export function validateStep(
  step: WizardStep,
  payload: z.infer<typeof ListingDraftPayloadSchema>,
): StepValidationResult {
  let result: z.SafeParseReturnType<unknown, unknown>;

  switch (step) {
    case "vin":
      result = StepVinSchema.safeParse(payload);
      break;
    case "photos":
      result = StepPhotosSchema.safeParse(payload);
      break;
    case "vehicle":
      result = StepVehicleSchema.safeParse(payload);
      break;
    case "specs":
      result = StepSpecsSchema.safeParse(payload);
      break;
    case "price":
      result = StepPriceSchema.safeParse(payload);
      break;
    case "location":
      result = StepLocationSchema.safeParse(payload);
      break;
    case "contact":
      result = StepContactSchema.safeParse(payload);
      break;
    case "review":
      // Review has no fields; it's gated by prior steps being validated.
      result = StepReviewSchema.safeParse(payload);
      break;
    default:
      return { valid: false, errors: ["Unknown step"], fieldErrors: {} };
  }

  if (result.success) {
    return { valid: true, errors: [], fieldErrors: {} };
  }

  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const message = issue.message ?? "Invalid value";
    errors.push(message);
    const key = (issue.path[0] ?? "").toString();
    // First issue per field wins — later ones are typically less specific.
    if (!(key in fieldErrors)) {
      fieldErrors[key] = message;
    }
  }
  return { valid: false, errors, fieldErrors };
}

// ── Draft payload extension ──
// Backward-compatible: adds validatedSteps alongside existing currentStep.

export const WizardDraftPayloadSchema = ListingDraftPayloadSchema.extend({
  validatedSteps: z.array(WizardStepSchema).optional(),
});
export type WizardDraftPayload = z.infer<typeof WizardDraftPayloadSchema>;

// ── Validate-step request / response ──

export const ValidateStepRequestSchema = z.object({
  step: WizardStepSchema,
  payload: WizardDraftPayloadSchema,
});
export type ValidateStepRequest = z.infer<typeof ValidateStepRequestSchema>;

export const ValidateStepResponseSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  fieldErrors: z.record(z.string(), z.string()).optional(),
  invalidatedSteps: z.array(WizardStepSchema),
});
export type ValidateStepResponse = z.infer<typeof ValidateStepResponseSchema>;
