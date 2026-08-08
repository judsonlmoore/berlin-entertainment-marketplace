type ProblemSolutionBlockProps = {
  /** Problem title */
  problemTitle: string;
  /** Problem description */
  problemBody: string;
};

export function ProblemSolutionBlock({
  problemTitle,
  problemBody,
}: ProblemSolutionBlockProps) {
  return (
    <section className="border-t border-[var(--rule)] bg-[var(--canvas)] py-10 sm:py-12">
      <div className="shell max-w-3xl">
        <h2 className="eyebrow mb-3 text-[var(--accent)]">{problemTitle}</h2>
        <p className="text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
          {problemBody}
        </p>
      </div>
    </section>
  );
}
