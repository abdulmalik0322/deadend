import { Icon } from '../../utils/icons.jsx';
import './StepWizard.css';

export default function StepWizard({ steps = [], current = 0, onStepClick }) {
  return (
    <ol className="step-wizard">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const clickable = onStepClick && i <= current;
        return (
          <li
            key={i}
            className={`step${done ? ' step--done' : ''}${active ? ' step--active' : ''}${clickable ? ' step--clickable' : ''}`}
            aria-current={active ? 'step' : undefined}
          >
            {clickable ? (
              <button
                type="button"
                className="step-inner"
                onClick={() => onStepClick(i)}
                aria-label={`Go to step ${i + 1}: ${step.title}`}
              >
                <StepDot i={i} done={done} />
                <StepText step={step} />
              </button>
            ) : (
              <span className="step-inner">
                <StepDot i={i} done={done} />
                <StepText step={step} />
              </span>
            )}
            {i < steps.length - 1 && <span className="step-connector" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function StepDot({ i, done }) {
  return (
    <span className="step-dot">
      {done ? <Icon name="check" size={14} /> : <span className="step-num">{i + 1}</span>}
    </span>
  );
}

function StepText({ step }) {
  return (
    <span className="step-text">
      <span className="step-title">{step.title}</span>
      {step.subtitle && <span className="step-subtitle">{step.subtitle}</span>}
    </span>
  );
}
