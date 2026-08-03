"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  acceptVenueInvitation,
  inviteVenueMember,
  removeVenueMember,
} from "@/src/actions/venue-membership";
import { useRouter } from "@/src/i18n/navigation";

type Member = {
  id: string;
  userId: string;
  role: "owner" | "member";
  status: "active" | "invited" | "removed";
  name: string | null;
  email: string | null;
};

type Props = {
  locale: "en" | "de";
  venueId: string;
  members: Member[];
  canManage: boolean;
  currentUserId: string;
};

export function VenueMembersPanel({
  locale,
  venueId,
  members,
  canManage,
  currentUserId,
}: Props) {
  const t = useTranslations("membership");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pendingInvite = members.find(
    (member) => member.userId === currentUserId && member.status === "invited",
  );

  return (
    <section className="grid gap-4">
      <h2 className="display text-2xl">{t("title")}</h2>

      {pendingInvite ? (
        <button
          type="button"
          disabled={pending}
          className="bg-[var(--accent)] px-4 py-3 text-[var(--background)]"
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await acceptVenueInvitation(
                pendingInvite.id,
                locale,
              );
              if (!result.ok) {
                setError(result.message);
                return;
              }
              router.refresh();
            });
          }}
        >
          {t("acceptInvite")}
        </button>
      ) : null}

      <ul className="grid gap-2">
        {members
          .filter((member) => member.status !== "removed")
          .map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-2 border border-[var(--line)] px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{member.name ?? member.email}</p>
                <p className="text-[var(--muted)]">
                  {member.role} · {member.status}
                </p>
              </div>
              {canManage && member.status === "active" ? (
                <button
                  type="button"
                  disabled={pending}
                  className="underline"
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const result = await removeVenueMember(member.id, locale);
                      if (!result.ok) {
                        setError(
                          result.code === "conflict"
                            ? t("lastOwnerError")
                            : result.message,
                        );
                        return;
                      }
                      router.refresh();
                    });
                  }}
                >
                  {t("remove")}
                </button>
              ) : null}
            </li>
          ))}
      </ul>

      {canManage ? (
        <form
          className="grid gap-2 border border-[var(--line)] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await inviteVenueMember({
                venueId,
                email: String(form.get("email") ?? ""),
                role: String(form.get("role") ?? "member") as
                  "owner" | "member",
                locale,
              });
              if (!result.ok) {
                setError(
                  result.code === "not_found"
                    ? t("userNotFound")
                    : result.code === "forbidden"
                      ? errors("forbidden")
                      : result.message,
                );
                return;
              }
              event.currentTarget.reset();
              router.refresh();
            });
          }}
        >
          <h3 className="font-medium">{t("inviteTitle")}</h3>
          <label className="grid gap-1 text-sm">
            <span>{t("email")}</span>
            <input
              name="email"
              type="email"
              required
              className="border border-[var(--line)] bg-transparent px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>{t("role")}</span>
            <select
              name="role"
              defaultValue="member"
              className="border border-[var(--line)] bg-transparent px-3 py-2"
            >
              <option value="member">{t("roleMember")}</option>
              <option value="owner">{t("roleOwner")}</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="bg-[var(--ink)] px-4 py-2 text-[var(--background)] disabled:opacity-60"
          >
            {t("invite")}
          </button>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </section>
  );
}
