export interface CheckboxOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface CheckboxGroupProps<T extends string> {
  name: string;
  legend?: string;
  options: readonly CheckboxOption<T>[];
  selected: readonly T[];
  onToggle: (value: T) => void;
  layout?: 'row' | 'column';
}

export function CheckboxGroup<T extends string>({
  name,
  legend,
  options,
  selected,
  onToggle,
  layout = 'row',
}: CheckboxGroupProps<T>) {
  return (
    <fieldset className="field">
      {legend ? <legend className="field__legend">{legend}</legend> : null}
      <div className={`choices choices--${layout}`}>
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          const isSelected = selected.includes(option.value);
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={`choice ${isSelected ? 'choice--selected' : ''}`}
            >
              <input
                id={id}
                type="checkbox"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onToggle(option.value)}
              />
              <span className="choice__marker choice__marker--box" aria-hidden="true" />
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
