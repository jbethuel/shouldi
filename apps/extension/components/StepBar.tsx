const TOTAL = 5;

/** A 5-step bar. `label` names what it measures, so screen readers announce e.g. "Skills: 4 of 5". */
export function StepBar({ steps, label, large = false }: { steps: number; label: string; large?: boolean }) {
  return (
    <div className={large ? "steps large" : "steps"} role="img" aria-label={`${label}: ${steps} of ${TOTAL}`}>
      {Array.from({ length: TOTAL }, (_, i) => (
        <span key={i} className={i < steps ? "on" : undefined} />
      ))}
    </div>
  );
}
