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

// ── Validation message keys ──
// Step schemas emit stable dotted keys, not English prose, so every client can
// render them in the user's own language. See ADR-0050. The keys are namespaced
// under `wizardErrors.` and the numeric limits below are exported so clients can
// interpolate them without duplicating the constants.

export const WIZARD_ERROR_KEY_PREFIX = "wizardErrors.";

const CURRENT_YEAR = new Date().getFullYear();

export const WIZARD_LIMITS = {
  vinMaxLength: 17,
  yearMin: 1900,
  yearMax: CURRENT_YEAR + 1,
  priceMax: 999_999_999,
  locationTextMaxLength: 200,
  descriptionMaxLength: 2000,
} as const;

const KEY = {
  required: "wizardErrors.required",
  invalidValue: "wizardErrors.invalidValue",
  unknownStep: "wizardErrors.unknownStep",
  vinTooLong: "wizardErrors.vinTooLong",
  photosRequired: "wizardErrors.photosRequired",
  photosUploading: "wizardErrors.photosUploading",
  brandRequired: "wizardErrors.brandRequired",
  modelRequired: "wizardErrors.modelRequired",
  yearRequired: "wizardErrors.yearRequired",
  yearWholeNumber: "wizardErrors.yearWholeNumber",
  yearTooEarly: "wizardErrors.yearTooEarly",
  yearTooLate: "wizardErrors.yearTooLate",
  mileageNegative: "wizardErrors.mileageNegative",
  enginePowerNotPositive: "wizardErrors.enginePowerNotPositive",
  mileageRequiredForUsed: "wizardErrors.mileageRequiredForUsed",
  priceRequired: "wizardErrors.priceRequired",
  priceNotPositive: "wizardErrors.priceNotPositive",
  priceTooLarge: "wizardErrors.priceTooLarge",
  regionRequired: "wizardErrors.regionRequired",
  cityRequired: "wizardErrors.cityRequired",
  locationTextTooLong: "wizardErrors.locationTextTooLong",
  descriptionRequired: "wizardErrors.descriptionRequired",
  descriptionTooLong: "wizardErrors.descriptionTooLong",
  contactChannelRequired: "wizardErrors.contactChannelRequired",
} as const;

// ── Per-step validation schemas ──
// Each schema validates exactly the fields required for its step.
// They are refinements of ListingDraftPayloadSchema — partial, step-scoped.

export const StepVinSchema = z.object({
  vin: z.string().max(WIZARD_LIMITS.vinMaxLength, KEY.vinTooLong).optional(),
});
export type StepVinInput = z.infer<typeof StepVinSchema>;

export const StepPhotosSchema = z.object({
  photos: z
    .array(DraftPhotoSchema)
    .min(1, KEY.photosRequired)
    .refine((photos) => photos.some((p) => p.key), KEY.photosUploading),
});
export type StepPhotosInput = z.infer<typeof StepPhotosSchema>;

export const StepVehicleSchema = z.object({
  brandId: z.string({ required_error: KEY.brandRequired }).uuid({ message: KEY.brandRequired }),
  modelId: z.string({ required_error: KEY.modelRequired }).uuid({ message: KEY.modelRequired }),
  generationId: z.string().uuid().optional(),
  year: z
    .number({ required_error: KEY.yearRequired, invalid_type_error: KEY.yearRequired })
    .int(KEY.yearWholeNumber)
    .min(WIZARD_LIMITS.yearMin, KEY.yearTooEarly)
    .max(WIZARD_LIMITS.yearMax, KEY.yearTooLate),
});
export type StepVehicleInput = z.infer<typeof StepVehicleSchema>;

export const StepSpecsSchema = z
  .object({
    condition: ListingConditionSchema,
    mileageKm: z.number().int().nonnegative(KEY.mileageNegative).optional(),
    colorId: z.string().uuid().optional(),
    bodyTypeId: z.string().uuid().optional(),
    transmissionId: z.string().uuid().optional(),
    driveTypeId: z.string().uuid().optional(),
    engineTypeId: z.string().uuid().optional(),
    enginePower: z.number().int().positive(KEY.enginePowerNotPositive).optional(),
    conditionDisclosure: ConditionDisclosureSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.condition === "used") {
        return data.mileageKm !== undefined;
      }
      return true;
    },
    { message: KEY.mileageRequiredForUsed, path: ["mileageKm"] },
  );
export type StepSpecsInput = z.infer<typeof StepSpecsSchema>;

export const StepPriceSchema = z.object({
  priceAmount: z
    .number({ required_error: KEY.priceRequired, invalid_type_error: KEY.priceRequired })
    .positive(KEY.priceNotPositive)
    .max(WIZARD_LIMITS.priceMax, KEY.priceTooLarge),
  priceCurrency: CurrencySchema,
  acceptsExchange: z.boolean().optional(),
  installmentAvailable: z.boolean().optional(),
});
export type StepPriceInput = z.infer<typeof StepPriceSchema>;

export const StepLocationSchema = z.object({
  regionId: z.string({ required_error: KEY.regionRequired }).uuid({ message: KEY.regionRequired }),
  cityId: z.string({ required_error: KEY.cityRequired }).uuid({ message: KEY.cityRequired }),
  locationText: z
    .string()
    .max(WIZARD_LIMITS.locationTextMaxLength, KEY.locationTextTooLong)
    .optional(),
});
export type StepLocationInput = z.infer<typeof StepLocationSchema>;

export const StepContactSchema = z
  .object({
    description: z
      .string({ required_error: KEY.descriptionRequired })
      .min(1, KEY.descriptionRequired)
      .max(WIZARD_LIMITS.descriptionMaxLength, KEY.descriptionTooLong),
    contactPhone: z.string().optional(),
    allowCalls: z.boolean(),
    allowChat: z.boolean(),
  })
  .refine(
    (data) => data.allowCalls || data.allowChat,
    {
      message: KEY.contactChannelRequired,
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
 * Turns Zod's own built-in messages into wizard error keys. Schema-level
 * messages take precedence over this map, so it only covers the issues we
 * never spelled out — a missing enum such as `condition`, for instance, would
 * otherwise reach the UI as the untranslated literal "Required".
 */
const wizardErrorMap: z.ZodErrorMap = (issue, ctx) => {
  // A contextual error map runs last and outranks the schema, so hand back any
  // message a step schema already spelled out rather than flattening it.
  if (ctx.defaultError.startsWith(WIZARD_ERROR_KEY_PREFIX)) {
    return { message: ctx.defaultError };
  }
  if (
    (issue.code === z.ZodIssueCode.invalid_type &&
      issue.received === z.ZodParsedType.undefined) ||
    issue.code === z.ZodIssueCode.invalid_enum_value
  ) {
    return { message: KEY.required };
  }
  return { message: ctx.defaultError };
};

const parseOptions = { errorMap: wizardErrorMap };

/**
 * Validate a single wizard step against a draft payload.
 * Returns client-side validation result (no server calls).
 *
 * Messages are `wizardErrors.*` keys, not display text — clients translate
 * them (ADR-0050). `WIZARD_LIMITS` carries the numbers the length and range
 * messages interpolate.
 */
export function validateStep(
  step: WizardStep,
  payload: z.infer<typeof ListingDraftPayloadSchema>,
): StepValidationResult {
  let result: z.SafeParseReturnType<unknown, unknown>;

  switch (step) {
    case "vin":
      result = StepVinSchema.safeParse(payload, parseOptions);
      break;
    case "photos":
      result = StepPhotosSchema.safeParse(payload, parseOptions);
      break;
    case "vehicle":
      result = StepVehicleSchema.safeParse(payload, parseOptions);
      break;
    case "specs":
      result = StepSpecsSchema.safeParse(payload, parseOptions);
      break;
    case "price":
      result = StepPriceSchema.safeParse(payload, parseOptions);
      break;
    case "location":
      result = StepLocationSchema.safeParse(payload, parseOptions);
      break;
    case "contact":
      result = StepContactSchema.safeParse(payload, parseOptions);
      break;
    case "review":
      // Review has no fields; it's gated by prior steps being validated.
      result = StepReviewSchema.safeParse(payload, parseOptions);
      break;
    default:
      return { valid: false, errors: [KEY.unknownStep], fieldErrors: {} };
  }

  if (result.success) {
    return { valid: true, errors: [], fieldErrors: {} };
  }

  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const message = issue.message ?? KEY.invalidValue;
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
