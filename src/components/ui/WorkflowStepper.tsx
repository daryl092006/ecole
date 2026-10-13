interface WorkflowStep {
  id: string;
  label: string;
  owner: string;
}

interface WorkflowStepperProps {
  steps: WorkflowStep[];
  currentStep: string;
  title?: string;
}

export default function WorkflowStepper({ steps, currentStep, title = 'Progression' }: WorkflowStepperProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div className="workflow-panel" aria-label={title}>
      <div className="workflow-title">{title}</div>
      <ol className="workflow-steps">
        {steps.map((step, index) => {
          const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming';
          return (
            <li key={step.id} className={`workflow-step ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="workflow-index">{index + 1}</span>
              <span>
                <strong>{step.label}</strong>
                <small>{state === 'current' ? 'Maintenant · ' : ''}{step.owner}</small>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
