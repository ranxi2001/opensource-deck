import { readFile } from "node:fs/promises";
import YAML from "yaml";
import {
  deckConfigFileSchema,
  normalizeDeckConfig,
  type DeckConfig,
} from "../../src/domain/schema";

export async function loadDeckConfig(path: string): Promise<DeckConfig> {
  const source = await readFile(path, "utf8");
  const parsed = YAML.parse(source) as unknown;
  return normalizeDeckConfig(deckConfigFileSchema.parse(parsed));
}
