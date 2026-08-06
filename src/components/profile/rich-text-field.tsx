"use client";

import {
  ParagraphTextField,
  toParagraphEditorHtml,
  type ParagraphTextFieldProps,
} from "@/src/components/profile/paragraph-text-field";

/** @deprecated Prefer ParagraphTextField — kept as a stable import alias. */
export function RichTextField(props: ParagraphTextFieldProps) {
  return <ParagraphTextField {...props} />;
}

export { ParagraphTextField, toParagraphEditorHtml };
export type { ParagraphTextFieldProps };
