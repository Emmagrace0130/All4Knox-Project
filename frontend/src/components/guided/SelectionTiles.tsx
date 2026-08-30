export interface TileOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface SelectionTilesProps<T extends string> {
  name: string;
  options: readonly TileOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

/**
 * Large single-select tiles — the primary input of the guided interview.
 * One tile per row so the whole row is an easy target during a visit.
 */
export function SelectionTiles<T extends string>({
  name,
  options,
  value,
  onChange,
}: SelectionTilesProps<T>) {
  return (
    <div className="tiles" role="radiogroup">
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            htmlFor={id}
            className={`tile ${selected ? 'tile--selected' : ''}`}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
            />
            <span className="tile__radio" aria-hidden="true" />
            <span className="tile__body">
              <span className="tile__label">{option.label}</span>
              {option.hint ? (
                <span className="tile__hint">{option.hint}</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

interface CheckTilesProps<T extends string> {
  name: string;
  options: readonly TileOption<T>[];
  selected: readonly T[];
  onToggle: (value: T) => void;
  /** Two-up grid for short labels such as UDS analytes. */
  columns?: boolean;
}

/** Multi-select variant, for "select all that apply" screens. */
export function CheckTiles<T extends string>({
  name,
  options,
  selected,
  onToggle,
  columns = false,
}: CheckTilesProps<T>) {
  return (
    <div className={`tiles ${columns ? 'tiles--grid' : ''}`}>
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        const isSelected = selected.includes(option.value);
        return (
          <label
            key={option.value}
            htmlFor={id}
            className={`tile ${isSelected ? 'tile--selected' : ''}`}
          >
            <input
              id={id}
              type="checkbox"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => onToggle(option.value)}
            />
            <span className="tile__check" aria-hidden="true" />
            <span className="tile__body">
              <span className="tile__label">{option.label}</span>
              {option.hint ? (
                <span className="tile__hint">{option.hint}</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
