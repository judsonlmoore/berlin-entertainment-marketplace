"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ENTERTAINER_CATEGORIES,
  VENUE_CATEGORIES,
  encodeSubcategory,
  getCategoryNode,
  parseSubcategory,
  taxonomyLabel,
  type TaxonomyNode,
} from "@/src/domain/profile-taxonomy";

type Props = {
  kind: "entertainer" | "venue";
  categoryName: string;
  subcategoryName: string;
  otherName: string;
  defaultCategory?: string | null | undefined;
  defaultSubcategoryRaw?: string | null | undefined;
  categoryLabel: string;
  subcategoryLabel: string;
  otherLabel: string;
  onSelectionChange?: (value: {
    categoryId: string;
    subcategoryId: string;
    otherLabel: string;
  }) => void;
  error?: string | null;
};

export function CategorySubcategorySelect({
  kind,
  categoryName,
  subcategoryName,
  otherName,
  defaultCategory,
  defaultSubcategoryRaw,
  categoryLabel,
  subcategoryLabel,
  otherLabel,
  onSelectionChange,
  error = null,
}: Props) {
  const t = useTranslations("profile");
  const locale = useLocale() === "de" ? "de" : "en";
  const tree: TaxonomyNode[] =
    kind === "entertainer" ? ENTERTAINER_CATEGORIES : VENUE_CATEGORIES;

  const parsed = parseSubcategory(defaultSubcategoryRaw);
  const initialCategory =
    defaultCategory && getCategoryNode(tree, defaultCategory)
      ? defaultCategory
      : "";

  const [categoryId, setCategoryId] = useState(initialCategory);
  const [subcategoryId, setSubcategoryId] = useState(
    initialCategory ? parsed.subcategoryId : "",
  );
  const [otherText, setOtherText] = useState(parsed.otherLabel);

  const category = getCategoryNode(tree, categoryId);
  const children = category?.children ?? [];

  const encoded = useMemo(
    () => encodeSubcategory(subcategoryId, otherText),
    [subcategoryId, otherText],
  );

  function emit(nextCategory: string, nextSub: string, nextOther: string) {
    onSelectionChange?.({
      categoryId: nextCategory,
      subcategoryId: nextSub,
      otherLabel: nextOther,
    });
  }

  return (
    <div
      className="grid gap-3 sm:grid-cols-2"
      data-field={categoryName}
      id={`field-${categoryName}`}
    >
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-[var(--ink)]">{categoryLabel}</span>
        <select
          name={categoryName}
          required
          className={`field${error ? " border-[var(--danger)]" : ""}`}
          aria-invalid={error ? true : undefined}
          value={categoryId}
          onChange={(event) => {
            const next = event.target.value;
            setCategoryId(next);
            const node = getCategoryNode(tree, next);
            const first = node?.children[0]?.id ?? "";
            setSubcategoryId(first);
            if (first !== "other") setOtherText("");
            emit(next, first, first === "other" ? otherText : "");
          }}
        >
          <option value="">{t("categorySelect")}</option>
          {tree.map((node) => (
            <option key={node.id} value={node.id}>
              {taxonomyLabel(node, locale)}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm">
        <span className="font-medium text-[var(--ink)]">
          {subcategoryLabel}
        </span>
        <select
          required
          className={`field${error ? " border-[var(--danger)]" : ""}`}
          value={subcategoryId}
          disabled={!categoryId}
          onChange={(event) => {
            const next = event.target.value;
            setSubcategoryId(next);
            if (next !== "other") setOtherText("");
            emit(categoryId, next, next === "other" ? otherText : "");
          }}
        >
          <option value="">{t("subcategorySelect")}</option>
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {taxonomyLabel(child, locale)}
            </option>
          ))}
        </select>
        <input type="hidden" name={subcategoryName} value={encoded} />
      </label>

      {subcategoryId === "other" ? (
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-[var(--ink)]">{otherLabel}</span>
          <input
            name={otherName}
            required
            className="field"
            value={otherText}
            onChange={(event) => {
              setOtherText(event.target.value);
              emit(categoryId, subcategoryId, event.target.value);
            }}
            placeholder={t("subcategoryOtherPlaceholder")}
          />
        </label>
      ) : (
        <input type="hidden" name={otherName} value="" />
      )}
      {error ? (
        <p role="alert" className="text-xs text-[var(--danger)] sm:col-span-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}
