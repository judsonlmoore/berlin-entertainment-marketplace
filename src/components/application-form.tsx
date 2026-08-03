"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitMarketplaceApplication } from "@/src/actions/onboarding";
import { Button } from "@/src/components/ui/button";
import { useRouter } from "@/src/i18n/navigation";

type Props = {
  locale: "en" | "de";
  defaultName: string;
  defaultEmail: string;
};

export function ApplicationForm({ locale, defaultName, defaultEmail }: Props) {
  const t = useTranslations("apply");
  const errors = useTranslations("errors");
  const ui = useTranslations("ui");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);
        const roles = form.getAll("roles").map(String) as Array<
          "entertainer" | "venue"
        >;

        startTransition(async () => {
          if (form.get("termsAccepted") !== "on") {
            setError(errors("validation"));
            return;
          }

          const note = String(form.get("applicationNote") ?? "").trim();
          const result = await submitMarketplaceApplication({
            name: String(form.get("name") ?? ""),
            berlinConnection: String(form.get("berlinConnection") ?? ""),
            ...(note ? { applicationNote: note } : {}),
            contactEmail: String(form.get("contactEmail") ?? ""),
            roles,
            termsAccepted: true,
            locale,
          });

          if (!result.ok) {
            setError(
              result.code === "validation" ||
                result.code === "unauthorized" ||
                result.code === "forbidden"
                ? errors(result.code)
                : result.message,
            );
            return;
          }

          setSuccess(true);
          router.push("/onboarding");
          router.refresh();
        });
      }}
    >
      <label className="grid gap-1">
        <span>{t("nameLabel")}</span>
        <input
          name="name"
          required
          defaultValue={defaultName}
          className="field"
        />
      </label>

      <fieldset className="grid gap-2">
        <legend>{t("rolesLabel")}</legend>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="roles"
            value="entertainer"
            defaultChecked
          />
          <span>{t("roleEntertainer")}</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="roles" value="venue" />
          <span>{t("roleVenue")}</span>
        </label>
      </fieldset>

      <label className="grid gap-1">
        <span>{t("berlinLabel")}</span>
        <textarea
          name="berlinConnection"
          required
          rows={3}
          className="field"
        />
      </label>

      <label className="grid gap-1">
        <span>{t("noteLabel")}</span>
        <textarea
          name="applicationNote"
          rows={3}
          className="field"
        />
      </label>

      <label className="grid gap-1">
        <span>{t("contactEmailLabel")}</span>
        <input
          name="contactEmail"
          type="email"
          required
          defaultValue={defaultEmail}
          className="field"
        />
      </label>

      <label className="flex items-start gap-2">
        <input type="checkbox" name="termsAccepted" required className="mt-1" />
        <span>{t("termsLabel")}</span>
      </label>

      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {success ? <p className="text-sm">{t("success")}</p> : null}

      <Button
        type="submit"
        pending={pending}
        pendingLabel={ui("working")}
        variant="primary"
      >
        {t("submit")}
      </Button>
    </form>
  );
}
