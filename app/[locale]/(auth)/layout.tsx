import type { ReactNode } from "react";
import { PublicHeader } from "@/src/components/public-header";
import { auth } from "@/src/auth";

type Props = {
  children: ReactNode;
};

export default async function AuthLayout({ children }: Props) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <PublicHeader signedIn={Boolean(session?.user)} showApplyCta />
      <main className="shell py-8 sm:py-12">{children}</main>
    </div>
  );
}
