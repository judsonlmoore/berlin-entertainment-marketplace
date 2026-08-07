"use server";

import { z } from "zod";
import {
  type ActionResult,
  requireActor,
  toActionError,
} from "@/src/actions/_shared";
import { upsertLegalIdentity } from "@/src/db/queries/legal-identity";
import { AppError } from "@/src/domain/errors";
import type { LegalEntityType } from "@/src/domain/legal-identity";
import { revalidatePath } from "next/cache";

const schema = z.object({
  entityType: z.enum(["individual", "freelancer", "registered_business"]),
  legalName: z.string().trim().min(1).max(200),
  tradingName: z.string().trim().max(200).optional().nullable(),
  addressLine1: z.string().trim().min(1).max(200),
  addressLine2: z.string().trim().max(200).optional().nullable(),
  postalCode: z.string().trim().min(1).max(32),
  city: z.string().trim().min(1).max(120),
  countryCode: z.string().trim().length(2),
  taxId: z.string().trim().max(64).optional().nullable(),
  companyRegisterId: z.string().trim().max(64).optional().nullable(),
  invoiceEmail: z.string().trim().email().max(200),
  iban: z.string().trim().max(64).optional().nullable(),
  bic: z.string().trim().max(32).optional().nullable(),
  paymentNote: z.string().trim().max(500).optional().nullable(),
  locale: z.enum(["en", "de"]).optional(),
});

export async function saveLegalIdentityAction(
  input: z.infer<typeof schema>,
): Promise<ActionResult> {
  try {
    const { session } = await requireActor();
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("validation", "Invalid legal identity");
    }

    await upsertLegalIdentity(session.user.id, {
      entityType: parsed.data.entityType as LegalEntityType,
      legalName: parsed.data.legalName,
      tradingName: parsed.data.tradingName ?? null,
      addressLine1: parsed.data.addressLine1,
      addressLine2: parsed.data.addressLine2 ?? null,
      postalCode: parsed.data.postalCode,
      city: parsed.data.city,
      countryCode: parsed.data.countryCode,
      taxId: parsed.data.taxId ?? null,
      companyRegisterId: parsed.data.companyRegisterId ?? null,
      invoiceEmail: parsed.data.invoiceEmail,
      iban: parsed.data.iban ?? null,
      bic: parsed.data.bic ?? null,
      paymentNote: parsed.data.paymentNote ?? null,
    });

    revalidatePath("/account");
    revalidatePath("/[locale]/account", "page");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
