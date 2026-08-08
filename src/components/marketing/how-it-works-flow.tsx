type HowItWorksStep = {
  number: string;
  title: string;
  body: string;
};

type HowItWorksFlowProps = {
  /** Section title */
  title: string;
  /** Array of 4 steps */
  steps: [HowItWorksStep, HowItWorksStep, HowItWorksStep, HowItWorksStep];
};

export function HowItWorksFlow({ title, steps }: HowItWorksFlowProps) {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="shell">
        <h2 className="page-title mb-10 text-center text-2xl sm:text-[1.75rem]">
          {title}
        </h2>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line (hidden on last item and mobile) */}
              {index < steps.length - 1 && (
                <div
                  aria-hidden="true"
                  className="absolute top-5 left-[calc(100%+0.75rem)] hidden h-px w-[calc(100%-1.5rem)] bg-[var(--rule)] lg:block"
                />
              )}

              <div className="relative">
                <p className="eyebrow mb-2 text-[var(--accent)]">
                  {step.number}
                </p>
                <h3 className="page-title mb-2 text-lg">{step.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
