import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

const BASE =
  'w-full rounded-xl border border-line bg-surface-2 px-3.5 text-base text-fg ' +
  'placeholder:text-fg-subtle transition-colors duration-150 ' +
  'focus:border-primary/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/25 ' +
  'disabled:opacity-60'

function Envoltura({
  etiqueta,
  hint,
  error,
  htmlFor,
  children,
}: {
  etiqueta?: string
  hint?: string
  error?: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      {etiqueta && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-fg-muted">
          {etiqueta}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : hint ? (
        <p className="text-sm text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta?: string
  hint?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { etiqueta, hint, error, className, id, ...props },
  ref,
) {
  const auto = useId()
  const idFinal = id ?? auto
  return (
    <Envoltura etiqueta={etiqueta} hint={hint} error={error} htmlFor={idFinal}>
      <input
        ref={ref}
        id={idFinal}
        className={cn(BASE, 'h-11', error && 'border-danger/60 focus:ring-danger/25', className)}
        {...props}
      />
    </Envoltura>
  )
})

/**
 * Input de número. inputMode="numeric" para que en el celular salga el
 * teclado numérico y no el alfabético — §3.1 del brief.
 */
export const InputNumero = forwardRef<HTMLInputElement, InputProps & { prefijo?: string }>(
  function InputNumero({ etiqueta, hint, error, className, id, prefijo, ...props }, ref) {
    const auto = useId()
    const idFinal = id ?? auto
    return (
      <Envoltura etiqueta={etiqueta} hint={hint} error={error} htmlFor={idFinal}>
        <div className="relative">
          {prefijo && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-fg-subtle">
              {prefijo}
            </span>
          )}
          <input
            ref={ref}
            id={idFinal}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={cn(
              BASE,
              'tabular h-11',
              prefijo && 'pl-8',
              error && 'border-danger/60 focus:ring-danger/25',
              className,
            )}
            {...props}
          />
        </div>
      </Envoltura>
    )
  },
)

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta?: string
  hint?: string
  error?: string
}

/** Select nativo: en móvil la rueda del sistema gana a cualquier dropdown propio. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { etiqueta, hint, error, className, id, children, ...props },
  ref,
) {
  const auto = useId()
  const idFinal = id ?? auto
  return (
    <Envoltura etiqueta={etiqueta} hint={hint} error={error} htmlFor={idFinal}>
      <select
        ref={ref}
        id={idFinal}
        className={cn(
          BASE,
          'h-11 appearance-none bg-[length:1.1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10',
          error && 'border-danger/60',
          className,
        )}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23A0A0AE' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...props}
      >
        {children}
      </select>
    </Envoltura>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  etiqueta?: string
  hint?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { etiqueta, hint, error, className, id, ...props },
  ref,
) {
  const auto = useId()
  const idFinal = id ?? auto
  return (
    <Envoltura etiqueta={etiqueta} hint={hint} error={error} htmlFor={idFinal}>
      <textarea
        ref={ref}
        id={idFinal}
        rows={3}
        className={cn(BASE, 'resize-none py-2.5 leading-relaxed', error && 'border-danger/60', className)}
        {...props}
      />
    </Envoltura>
  )
})

/** Interruptor. 44px de alto de área táctil aunque el riel se vea más chico. */
export function Switch({
  activo,
  onCambio,
  etiqueta,
  descripcion,
  disabled,
}: {
  activo: boolean
  onCambio: (v: boolean) => void
  etiqueta: string
  descripcion?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={disabled}
      onClick={() => onCambio(!activo)}
      className="flex w-full items-center justify-between gap-4 py-2 text-left disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block text-base text-fg">{etiqueta}</span>
        {descripcion && <span className="block text-sm text-fg-subtle">{descripcion}</span>}
      </span>
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-out',
          activo ? 'bg-primary' : 'bg-surface-3',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm',
            'transition-transform duration-200 ease-out',
            activo ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}
