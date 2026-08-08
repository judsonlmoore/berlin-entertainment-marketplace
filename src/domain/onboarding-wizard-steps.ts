/**
 * One-shot publish-path wizard steps (Airbnb-style chapters).
 * After exit, editing continues only on /profile — these IDs are first-session only.
 */

export type WizardRole = "entertainer" | "venue";

export type WizardStepKind = "field" | "media" | "legal" | "publish";

export type WizardStepDef = {
  id: string;
  chapter: "A" | "B" | "C";
  kind: WizardStepKind;
  /** Required before Next (Skip unavailable). */
  required: boolean;
  /** Soft-required later for publish; Skip allowed once minimum draft exists. */
  skippable: boolean;
};

/** Talent publish-path steps in order. */
export const ENTERTAINER_WIZARD_STEPS: readonly WizardStepDef[] = [
  {
    id: "basics",
    chapter: "A",
    kind: "field",
    required: true,
    skippable: false,
  },
  {
    id: "hero_photo",
    chapter: "A",
    kind: "media",
    required: false,
    skippable: true,
  },
  {
    id: "location",
    chapter: "A",
    kind: "field",
    required: false,
    skippable: true,
  },
  {
    id: "fee",
    chapter: "A",
    kind: "field",
    required: false,
    skippable: true,
  },
  {
    id: "links",
    chapter: "A",
    kind: "field",
    required: false,
    skippable: true,
  },
  {
    id: "legal",
    chapter: "B",
    kind: "legal",
    required: false,
    skippable: true,
  },
  {
    id: "notes",
    chapter: "B",
    kind: "field",
    required: false,
    skippable: true,
  },
  {
    id: "go_live",
    chapter: "C",
    kind: "publish",
    required: true,
    skippable: false,
  },
] as const;

/** Buyer publish-path steps in order. */
export const VENUE_WIZARD_STEPS: readonly WizardStepDef[] = [
  {
    id: "basics",
    chapter: "A",
    kind: "field",
    required: true,
    skippable: false,
  },
  {
    id: "address",
    chapter: "A",
    kind: "field",
    required: false,
    skippable: true,
  },
  {
    id: "capacity",
    chapter: "A",
    kind: "field",
    required: false,
    skippable: true,
  },
  {
    id: "hero_photo",
    chapter: "A",
    kind: "media",
    required: false,
    skippable: true,
  },
  {
    id: "legal",
    chapter: "B",
    kind: "legal",
    required: false,
    skippable: true,
  },
  {
    id: "notes",
    chapter: "B",
    kind: "field",
    required: false,
    skippable: true,
  },
  {
    id: "go_live",
    chapter: "C",
    kind: "publish",
    required: true,
    skippable: false,
  },
] as const;

export function wizardStepsForRole(
  role: WizardRole,
): readonly WizardStepDef[] {
  return role === "entertainer"
    ? ENTERTAINER_WIZARD_STEPS
    : VENUE_WIZARD_STEPS;
}

export function wizardChapters(
  steps: readonly WizardStepDef[],
): Array<"A" | "B" | "C"> {
  const seen = new Set<"A" | "B" | "C">();
  const order: Array<"A" | "B" | "C"> = [];
  for (const step of steps) {
    if (!seen.has(step.chapter)) {
      seen.add(step.chapter);
      order.push(step.chapter);
    }
  }
  return order;
}

export function stepIndexById(
  steps: readonly WizardStepDef[],
  id: string,
): number {
  return steps.findIndex((step) => step.id === id);
}

export function chapterNumber(chapter: "A" | "B" | "C"): number {
  return chapter === "A" ? 1 : chapter === "B" ? 2 : 3;
}
