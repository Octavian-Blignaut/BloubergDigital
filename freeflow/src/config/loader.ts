import fs from "fs";
import path from "path";
import { ClientConfig } from "./types";

const CLIENTS_DIR = path.join(__dirname, "..", "..", "clients");

/** Loads a client config by businessId (the JSON filename without extension). */
export function loadClientConfig(businessId: string): ClientConfig {
  const filePath = path.join(CLIENTS_DIR, `${businessId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`No client config found for "${businessId}" at ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const config = JSON.parse(raw) as ClientConfig;
  validateClientConfig(config, filePath);
  return config;
}

/** Lists all businessIds available in /clients. */
export function listClientIds(): string[] {
  return fs
    .readdirSync(CLIENTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

function validateClientConfig(config: ClientConfig, filePath: string): void {
  const required: (keyof ClientConfig)[] = [
    "businessId",
    "businessName",
    "trade",
    "ownerName",
    "ownerWhatsApp",
    "serviceArea",
    "hours",
    "calloutFee",
    "qualifyingQuestions",
    "tone",
  ];
  for (const field of required) {
    if (!config[field]) {
      throw new Error(`Client config ${filePath} is missing required field "${field}"`);
    }
  }
  if (!Array.isArray(config.qualifyingQuestions) || config.qualifyingQuestions.length === 0) {
    throw new Error(`Client config ${filePath} must have at least one qualifying question`);
  }
}
