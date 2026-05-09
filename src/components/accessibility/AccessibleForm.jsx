import { cn } from '@/lib/utils';

export function AccessibleLabel({ htmlFor, required, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 rounded px-1'
      )}
    >
      {children}
      {required && <span aria-label="requerido" className="text-destructive ml-1">*</span>}
    </label>
  );
}

export function AccessibleInput({
  id,
  type = 'text',
  required,
  ariaDescribedBy,
  ariaLabel,
  error,
  helpText,
  ...props
}) {
  const describedBy = [
    ariaDescribedBy,
    error ? `${id}-error` : null,
    helpText ? `${id}-help` : null
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-2">
      <input
        id={id}
        type={type}
        required={required}
        aria-label={ariaLabel}
        aria-describedby={describedBy || undefined}
        aria-invalid={!!error}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive'
        )}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {helpText && (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          {helpText}
        </p>
      )}
    </div>
  );
}

export function AccessibleSelect({
  id,
  label,
  required,
  options,
  error,
  ariaDescribedBy,
  ...props
}) {
  const describedBy = [
    ariaDescribedBy,
    error ? `${id}-error` : null
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <select
        id={id}
        required={required}
        aria-describedby={describedBy || undefined}
        aria-invalid={!!error}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive'
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}