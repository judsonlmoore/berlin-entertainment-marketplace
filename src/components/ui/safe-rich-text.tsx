import { sanitizeRichTextHtml } from "@/src/domain/sanitize-input";

type Props = {
  html: string;
  className?: string;
};

/**
 * Renders sanitized paragraph HTML (or legacy plain text) for public/read views.
 */
export function SafeRichText({ html, className }: Props) {
  const clean = sanitizeRichTextHtml(html || "");
  if (!clean) return null;

  if (!/<[a-z][\s\S]*>/i.test(clean)) {
    return (
      <div
        className={
          className ? `${className} whitespace-pre-wrap` : "whitespace-pre-wrap"
        }
      >
        {clean}
      </div>
    );
  }

  return (
    <div
      className={
        className
          ? `${className} [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--rule)] [&_blockquote]:pl-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5`
          : "[&_blockquote]:border-l-2 [&_blockquote]:border-[var(--rule)] [&_blockquote]:pl-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5"
      }
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
