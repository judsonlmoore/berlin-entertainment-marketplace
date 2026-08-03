"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DeleteAccountModal } from "./delete-account-modal";

type Props = {
  userEmail: string;
};

export function AccountDeletionSection({ userEmail }: Props) {
  const t = useTranslations("accountDeletion");
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="panel space-y-4 p-6">
        <div className="border-l-4 border-[var(--danger)] pl-4">
          <h2 className="page-title text-xl text-[var(--danger)]">
            {t("dangerZoneTitle")}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {t("dangerZoneBody")}
          </p>
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--warning-soft)] p-4">
          <h3 className="text-sm font-semibold text-[var(--ink)]">
            {t("deleteAccountTitle")}
          </h3>
          <p className="mt-2 text-sm text-[var(--ink)]">
            {t("deleteAccountDescription")}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--danger)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--danger)] transition-colors hover:bg-[var(--danger)] hover:text-white"
          >
            {t("deleteAccountButton")}
          </button>
        </div>
      </div>

      <DeleteAccountModal
        userEmail={userEmail}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
