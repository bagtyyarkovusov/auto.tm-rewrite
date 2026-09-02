import { validateCurrentEasBuildProfile } from "../src/config/easBuildProfileValidation";

declare const process: {
  env: Record<string, string | undefined>;
  exit: (code?: number) => never;
};

const errors = validateCurrentEasBuildProfile(process.env);

if (errors.length > 0) {
  console.error("Invalid EAS build environment:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`EAS build environment valid for ${process.env["EAS_BUILD_PROFILE"] ?? "unknown"} profile.`);
