import { auth } from "@/src/auth";
import { getActorContext } from "@/src/db/queries/actor";
import { can, type ActorContext } from "@/src/domain/permissions";

export type DiscoveryAccess =
  | { ok: true; actor: ActorContext }
  | { ok: false; reason: "signed_out" | "forbidden" };

export async function requireDiscoveryAccess(): Promise<DiscoveryAccess> {
  const session = await auth();
  if (!session?.user?.id || !process.env.DATABASE_URL) {
    return { ok: false, reason: "signed_out" };
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || !can(actor, "marketplace.discover")) {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: true, actor };
}
