import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { generateOpenApiDocument } from "../src/openapi";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "..", "openapi.json");

const doc = generateOpenApiDocument();
writeFileSync(outPath, JSON.stringify(doc, null, 2) + "\n");

console.log(`OpenAPI spec written to ${outPath}`);
