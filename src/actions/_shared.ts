import { auth } from "@/src/auth";
import { getActorContext } from "@/src/db/queries/actor";
import { AppError } from "@/src/domain/errors";

export type ActionResult =
  | {
      ok: true;
      id?: string;
      uploadUrl?: string;
      key?: string;
      expired?: number;
      expiredHolds?: number;
      expiredRequests?: number;
    }
  | { ok: false; code: string; message: string };

export function toActionError(error: unknown): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, code: error.code, message: error.message };
  }
  throw error;
}

export async function requireActor() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AppError("unauthorized", "Sign in required");
  }
  const actor = await getActorContext(session.user.id);
  if (!actor) {
    throw new AppError("unauthorized", "Sign in required");
  }
  return { session, actor };
}
