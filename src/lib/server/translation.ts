import "server-only";
import { translateWithLocalQwen } from "@/lib/server/ollama";

export type TranslationInput = {
  sourceText: string;
  currentTranslation?: string;
};

export async function translateEditedSubtitle(input: TranslationInput) {
  return translateWithLocalQwen(input);
}
