import { eq } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { users } from "../src/db/schema";

async function main() {
  const email = process.argv[2];
  if (!email) {
    throw new Error("Usage: tsx scripts/set-staff.ts email@example.com");
  }
  const db = getDb();
  const [updated] = await db
    .update(users)
    .set({ isPlatformStaff: true, updatedAt: new Date() })
    .where(eq(users.email, email.toLowerCase()))
    .returning({ email: users.email, staff: users.isPlatformStaff });
  console.log(updated ?? "no user found");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
