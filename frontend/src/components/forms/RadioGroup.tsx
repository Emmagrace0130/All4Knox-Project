export interface RadioOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface RadioGroupProps<T extends string> {
  name: string;
  legend?: string;
  options: readonly RadioOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** `row` for short answer sets, `column` when labels are long. */
  layout?: 'row' | 'column';
}

/** Accessible radio group styled as one-click selection tiles. */
export function RadioGroup<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  layout = 'row',
}: RadioGroupProps<T>) {
  return (
    <fieldset className="field">
      {legend ? <legend className="field__legend">{legend}</legend> : null}
      <div className={`choices choices--${layout}`}>
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={`choice ${selected ? 'choice--selected' : ''}`}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
              />
              <span className="choice__marker" aria-hidden="true" />
              <span className="choice__text">
                <span className="choice__label">{option.label}</span>
                {option.hint ? (
                  <span className="choice__hint">{option.hint}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
