"use server";

import {
  type ActionResult,
  requireActor,
  toActionError,
} from "@/src/actions/_shared";
import {
  dismissOnboardingChecklist,
  markOnboardingChecklistStep,
  type OnboardingChecklistStepKey,
} from "@/src/db/queries/onboarding-checklist";
import { AppError } from "@/src/domain/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const stepSchema = z.enum(["searched", "openedResult"]);

export async function markOnboardingChecklistStepAction(input: {
  step: OnboardingChecklistStepKey;
}): Promise<ActionResult> {
  try {
    const parsed = stepSchema.safeParse(input.step);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid checklist step");
    }
    const { actor, support } = await requireActor();
    if (actor.isPlatformStaff || support) {
      return { ok: true };
    }
    await markOnboardingChecklistStep({
      userId: actor.userId,
      step: parsed.data,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function dismissOnboardingChecklistAction(): Promise<ActionResult> {
  try {
    const { actor, support } = await requireActor();
    if (actor.isPlatformStaff || support) {
      throw new AppError("forbidden", "Checklist is for marketplace members");
    }
    await dismissOnboardingChecklist(actor.userId);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
