export interface SelectProps<T> {
  id: string;
  label: string;
  items: T[];
  value: string;
  getValue: (item: T) => string;
  getLabel: (item: T) => string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}
export function Select<T>({
  id,
  label,
  items,
  value,
  getValue,
  getLabel,
  onChange,
  disabled,
  error,
}: SelectProps<T>) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} <span className="required">Required</span>
      </label>
      <select
        id={id}
        required
        value={value}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Choose {label.toLowerCase()}</option>
        {items.map((item) => (
          <option key={getValue(item)} value={getValue(item)}>
            {getLabel(item)}
          </option>
        ))}
      </select>
      {error && (
        <small className="field-error" id={`${id}-error`}>
          {error}
        </small>
      )}
    </div>
  );
}
