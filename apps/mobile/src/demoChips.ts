import questionsJson from "../../../data/eval/questions.json";

/**
 * The "Try asking" chips on the Ask screen. A chip that stands for one of the demo questions (the same
 * pairs as the website's demo cards and `pnpm warm-cache`) sends the exact question text from
 * data/eval/questions.json under its scenario, so it is answered from the committed demo cache with no
 * live Gemini call. The short label is only what the chip shows. A chip without `demo` sends its label
 * under the active environment.
 */
export interface Chip {
  label: string;
  demo?: { id: string; question: string; scenarioId: string };
}

// Keep in sync with DEMO_BUTTONS in apps/web/src/pages/Ask.tsx and apps/worker/scripts/warm-cache.mjs.
const DEMO_SCENARIO: Record<string, string> = { q2: "moon-challenge", q3: "moon-fm2", q4: "moon-fm2" };

function demo(id: string): Chip["demo"] {
  const question = questionsJson.questions.find((q) => q.id === id)?.question;
  const scenarioId = DEMO_SCENARIO[id];
  return question && scenarioId ? { id, question, scenarioId } : undefined;
}

export const CHIPS: Chip[] = [
  { label: "Nearest tested condition for this habitat?", demo: demo("q2") },
  { label: "Biggest lunar gap?", demo: demo("q4") },
  { label: "Compare BASS and Saffire on scale", demo: demo("q3") },
];
