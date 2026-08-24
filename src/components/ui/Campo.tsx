import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { DESPLEGAR, DURACION, transicion } from '../../lib/animacion'
import { cn } from '../../lib/cn'

const BASE =
  'w-full rounded-xl border border-line bg-surface-2 px-3.5 text-base text-fg ' +
  'placeholder:text-fg-subtle transition-colors duration-150 ' +
  'focus:border-primary/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/25 ' +
  'disabled:opacity-60'

/**
 * Ata el mensaje al campo para quien no lo está viendo.
 *
 * El error se pintaba en rojo debajo del input y ahí se acababa: para un
 * lector de pantalla el campo seguía siendo válido y sin descripción. Quien
 * navega a ciegas oía "Correo, cuadro de edición" y nada más — el motivo
 * del rechazo estaba en pantalla y era el único que no se enteraba.
 *
 * Devuelve el par que hay que ponerle al control. Va aquí y no en cada
 * campo porque los cuatro (input, número, select, textarea) comparten la
 * misma envoltura, y porque el id lo tiene que conocer también el <p>.
 */
export function atributosDescripcion(idFinal: string, error?: string, hint?: string) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${idFinal}-error` : hint ? `${idFinal}-hint` : undefined,
  } as const
}

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
      {/*
        El error se despliega en vez de aparecer de golpe: al validar un
        formulario largo salían tres o cuatro a la vez y todo lo de abajo
        pegaba un brinco, que es justo cuando se pierde de vista cuál campo
        falló. Al colapsar la altura, el empujón se vuelve legible.
      */}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="error"
            id={`${htmlFor}-error`}
            variants={DESPLEGAR}
            initial="oculto"
            animate="visible"
            exit="saliendo"
            transition={transicion(DURACION.rapida)}
            className="overflow-hidden text-sm text-danger"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <p key="hint" id={`${htmlFor}-hint`} className="text-sm text-fg-subtle">
            {hint}
          </p>
        ) : null}
      </AnimatePresence>
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
        {...atributosDescripcion(idFinal, error, hint)}
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
            {...atributosDescripcion(idFinal, error, hint)}
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

/**
 * Select nativo: en móvil la rueda del sistema gana a cualquier dropdown propio.
 *
 * La flecha es un icono de la librería y no un SVG incrustado en un
 * `background-image`. Dentro de un data URI el color va escrito a mano, y el
 * que estaba —#A0A0AE— es el `--fg-muted` del tema OSCURO: en claro la
 * flecha salía lavada mientras el texto de al lado iba en un gris mucho más
 * firme. Como elemento hereda `currentColor` y los dos temas se resuelven
 * solos. De paso deja de haber un icono dibujado a mano conviviendo con la
 * familia de lucide que usa el resto de la app.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { etiqueta, hint, error, className, id, children, ...props },
  ref,
) {
  const auto = useId()
  const idFinal = id ?? auto
  return (
    <Envoltura etiqueta={etiqueta} hint={hint} error={error} htmlFor={idFinal}>
      <div className="relative">
        <select
          ref={ref}
          id={idFinal}
          {...atributosDescripcion(idFinal, error, hint)}
          className={cn(
            BASE,
            'h-11 appearance-none pr-10',
            error && 'border-danger/60 focus:ring-danger/25',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          strokeWidth={2.5}
          className="pointer-events-none absolute right-3 top-1/2 size-[1.1rem] -translate-y-1/2 text-fg-muted"
        />
      </div>
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
        {...atributosDescripcion(idFinal, error, hint)}
        className={cn(
          BASE,
          'resize-none py-2.5 leading-relaxed',
          error && 'border-danger/60 focus:ring-danger/25',
          className,
        )}
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
        {/*
          La perilla se pinta contra su riel, no en blanco fijo. Apagado el
          riel es `surface-3`, que en tema claro es un gris casi blanco: una
          perilla blanca encima daba 1.1:1 y el interruptor parecía un riel
          vacío. Encendido el riel es `primary`, y ahí `primary-fg` es el
          token que ya existe para lo que va montado sobre el morado.
        */}
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full shadow-sm',
            activo ? 'bg-primary-fg' : 'bg-fg-muted',
            'transition-transform duration-200 ease-out',
            activo ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}
