import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "@/src/i18n/navigation";
import { ManageCookiePreferencesButton } from "@/src/components/manage-cookie-preferences-button";

const MANAGE_COOKIE_RE = /\{\{manage-cookie-preferences:([^}]+)\}\}/;

const markdownComponents: Components = {
  a({ href, children }) {
    const hrefValue = typeof href === "string" ? href : undefined;
    if (hrefValue && hrefValue.startsWith("/") && !hrefValue.startsWith("//")) {
      return <Link href={hrefValue}>{children}</Link>;
    }

    const external = Boolean(hrefValue?.startsWith("http"));
    return (
      <a
        href={hrefValue}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="legal-table-wrap">
        <table>{children}</table>
      </div>
    );
  },
};

type Props = {
  content: string;
};

export function MarkdownDocument({ content }: Props) {
  const segments: Array<
    { type: "markdown"; value: string } | { type: "manage"; label: string }
  > = [];
  let remaining = content;
  let match = remaining.match(MANAGE_COOKIE_RE);

  while (match && match.index !== undefined) {
    const before = remaining.slice(0, match.index);
    if (before.trim()) {
      segments.push({ type: "markdown", value: before });
    }
    const label = match[1]?.trim();
    if (label) {
      segments.push({ type: "manage", label });
    }
    remaining = remaining.slice(match.index + match[0].length);
    match = remaining.match(MANAGE_COOKIE_RE);
  }

  if (remaining.trim()) {
    segments.push({ type: "markdown", value: remaining });
  }

  return (
    <>
      {segments.map((segment, index) =>
        segment.type === "manage" ? (
          <ManageCookiePreferencesButton
            key={`manage-${index}`}
            label={segment.label}
          />
        ) : (
          <ReactMarkdown
            key={`md-${index}`}
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {segment.value}
          </ReactMarkdown>
        ),
      )}
    </>
  );
}
