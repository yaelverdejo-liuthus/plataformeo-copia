import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { DESPLEGAR, DURACION, transicion } from '../../lib/animacion'
import { cn } from '../../lib/cn'
import { Popover } from './Popover'

/*
 * ── El campo es un HUECO, no una caja ────────────────────────────────
 *
 * Este es el otro lado del material. Una tarjeta es una pieza de barro
 * POSADA sobre la mesa: tiene filo arriba y sombra proyectada debajo. Un
 * campo de formulario es lo contrario — un hueco EXCAVADO en la pieza — y
 * por eso lleva `.pozo`: sombra interior desde arriba, ningún apoyo
 * debajo. Un hoyo no proyecta sombra.
 *
 * La distinción no es un juego formal, es lo que hace que un formulario
 * se entienda sin leer nada: lo que sobresale se aprieta, lo que se hunde
 * se llena. Antes los dos eran el mismo rectángulo con borde de 1px y la
 * única diferencia era el color de fondo.
 *
 * El error no pinta un borde rojo —no hay bordes— sino que tiñe el propio
 * hueco. La `ring` de error se queda porque un hueco rojo sobre una
 * superficie oscura es un cambio sutil, y un campo rechazado tiene que
 * encontrarse de un vistazo en un formulario de doce.
 */
const BASE =
  'pozo w-full rounded-xl px-3.5 text-base text-fg ' +
  'placeholder:text-fg-subtle ' +
  '[transition-property:box-shadow,background-color] duration-150 ease-salida ' +
  'disabled:opacity-60'

/**
 * El pozo de un campo rechazado. La clase vive en index.css porque tiene
 * que SUMAR su filo rojo a la sombra del hueco, y las utilidades `ring-*`
 * de Tailwind sustituyen `box-shadow` en vez de sumarse a él.
 */
const POZO_ERROR = 'pozo-error'

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

/**
 * La etiqueta, el control y su mensaje. Exportada porque los selectores de
 * fecha y hora no son `<input>` —son un botón que abre un panel— pero
 * tienen que verse y anunciarse igual que el resto de los campos.
 */
export function Envoltura({
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
      {/* El `id` de la etiqueta permite que un control que NO es el
          <input> apuntado por `htmlFor` -el disparador del Select, que es
          un <button>- se ate a ella con `aria-labelledby`. Un <label>
          solo nombra automaticamente a controles nativos. */}
      {etiqueta && (
        <label
          id={`${htmlFor}-etiqueta`}
          htmlFor={htmlFor}
          className="block text-sm font-medium text-fg-muted"
        >
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
        className={cn(BASE, 'h-11', error && POZO_ERROR, className)}
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
              error && POZO_ERROR,
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
 * Lee las <option> que le pasaron como hijos.
 *
 * Se conserva esa API a proposito: hay una veintena de <Select> repartidos
 * por la app y todos escriben sus opciones como <option>, muchas veces con
 * un `.map()` en medio. Cambiar la firma habria obligado a tocar los
 * veinte; leerlas aqui no obliga a tocar ninguno.
 */
function leerOpciones(children: ReactNode): { valor: string; texto: string; disabled?: boolean }[] {
  return Children.toArray(children)
    .filter(isValidElement)
    .filter((el) => el.type === 'option')
    .map((el) => {
      const p = el.props as { value?: string | number; children?: ReactNode; disabled?: boolean }
      return {
        valor: String(p.value ?? ''),
        texto: Children.toArray(p.children).join(''),
        disabled: p.disabled,
      }
    })
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta?: string
  hint?: string
  error?: string
}

/**
 * Select propio, con el <select> nativo escondido debajo.
 *
 * -- Por que dejo de ser nativo ----------------------------------------
 *
 * Antes esto era un <select> normal, con el argumento de que "en movil la
 * rueda del sistema gana a cualquier dropdown propio". El argumento sigue
 * siendo bueno para la ergonomia; el problema es otro y no tiene arreglo
 * desde CSS: el desplegable de un <select> lo dibuja el SISTEMA
 * OPERATIVO, y en iOS ignora `color-scheme`. O sea que con la app en tema
 * claro se abria igual un panel negro, y al reves -- la unica superficie
 * de toda la app que no se puede tematizar.
 *
 * No era un caso aislado de una pantalla: son ~20 selects en 8 archivos,
 * asi que se arregla en la primitiva y se corrigen los veinte de una vez.
 *
 * -- El <select> nativo sigue ahi, y eso es lo importante --------------
 *
 * Debajo del disparador vive un <select> real, visualmente escondido pero
 * NO deshabilitado. Es lo que recibe el `ref` y el `name` de
 * `register()`, lo que valida react-hook-form y lo que enviaria un submit
 * nativo. Este componente solo le pone una cara: nada de la logica de
 * formularios cambio, y por eso no hubo que tocar ni una llamada.
 *
 * Se reusa `Popover`, el mismo que ya usan SelectorFecha y SelectorHora,
 * que ademas se convierte solo en hoja inferior por debajo de 640px. Asi
 * los tres selectores de la app se abren igual.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { etiqueta, hint, error, className, id, children, disabled, ...props },
  ref,
) {
  const auto = useId()
  const idFinal = id ?? auto
  const nativo = useRef<HTMLSelectElement | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [disparador, setDisparador] = useState<HTMLButtonElement | null>(null)
  const [valor, setValor] = useState('')

  const opciones = useMemo(() => leerOpciones(children), [children])

  /*
   * Sincroniza el valor mostrado con el que tiene el <select> de verdad.
   *
   * Va SIN arreglo de dependencias, o sea que corre despues de cada
   * render, y es deliberado: react-hook-form escribe el valor directo en
   * el nodo cuando se llama a `setValue` -- por ejemplo al elegir un
   * diseno del catalogo, que precarga nivel y zona -- y eso no dispara
   * ningun evento que se pueda escuchar. Lo que si ocurre es que el
   * formulario se vuelve a renderizar, y ahi es donde esto lo alcanza.
   *
   * Solo llama a `setValor` cuando de verdad cambio, asi que no hay bucle.
   *
   * El linter avisa de esto y su sugerencia -poner una lista vacia- es
   * justo lo que NO hay que hacer: con `[]` solo correria al montar y el
   * disparador se quedaria mostrando el valor inicial para siempre.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const v = nativo.current?.value ?? ''
    setValor((previo) => (previo === v ? previo : v))
  })

  const elegida = opciones.find((o) => o.valor === valor)

  /*
   * Estable con useCallback y no una flecha en linea. Un ref en linea
   * cambia de identidad en cada render, y React responde llamandolo con
   * null y luego con el elemento: dos `setState` por render, con un
   * instante en que el disparador es null y el panel no tiene a que
   * anclarse. Es la misma nota que hay en SelectorHora.
   */
  const guardarDisparador = useCallback((el: HTMLButtonElement | null) => {
    setDisparador(el)
  }, [])

  const guardarNativo = useCallback(
    (el: HTMLSelectElement | null) => {
      nativo.current = el
      if (typeof ref === 'function') ref(el)
      else if (ref) ref.current = el
    },
    [ref],
  )

  /*
   * Escribir el valor con el setter del prototipo y luego lanzar el evento.
   *
   * Asignar `nodo.value = x` a secas no basta: React lleva su propio
   * rastreador del valor de cada control y, si el valor que ve coincide
   * con el que el anoto, se salta el evento -- el `onChange` de
   * `register()` nunca se enteraria y el formulario se quedaria con el
   * valor viejo. Llamando al setter nativo se actualiza el nodo por
   * debajo del rastreador, y el `change` que va despues si llega.
   */
  function elegir(v: string) {
    const nodo = nativo.current
    if (nodo) {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLSelectElement.prototype,
        'value',
      )?.set
      setter?.call(nodo, v)
      nodo.dispatchEvent(new Event('change', { bubbles: true }))
    }
    setValor(v)
    setAbierto(false)
    disparador?.focus()
  }

  return (
    <Envoltura etiqueta={etiqueta} hint={hint} error={error} htmlFor={idFinal}>
      <div className="relative">
        {/*
          El <select> de verdad. `sr-only` y no `display:none` ni
          `disabled`: tiene que seguir existiendo en el formulario para que
          react-hook-form lo registre y para que un submit nativo lo
          incluya. `tabIndex={-1}` porque quien navega con teclado debe
          caer en el disparador, no aqui; `aria-hidden` para que un lector
          de pantalla tampoco anuncie el control dos veces.
        */}
        <select
          ref={guardarNativo}
          id={idFinal}
          tabIndex={-1}
          aria-hidden
          disabled={disabled}
          className="sr-only"
          {...props}
        >
          {children}
        </select>

        <button
          ref={guardarDisparador}
          type="button"
          disabled={disabled}
          onClick={() => setAbierto((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={abierto}
          /* Se nombra con la etiqueta MAS su propio contenido, en ese
             orden, para que se anuncie "Origen, Meta". Con solo
             `aria-label` se perderia el valor elegido; sin nada, se
             perderia la etiqueta, porque el <label> nombra al <select>
             escondido y no a este boton. */
          id={`${idFinal}-boton`}
          aria-labelledby={
            etiqueta ? `${idFinal}-etiqueta ${idFinal}-boton` : undefined
          }
          {...atributosDescripcion(idFinal, error, hint)}
          className={cn(
            BASE,
            'flex h-11 items-center justify-between gap-2 pr-3 text-left',
            error && POZO_ERROR,
            className,
          )}
        >
          <span className={cn('truncate', elegida && elegida.valor ? 'text-fg' : 'text-fg-subtle')}>
            {elegida ? elegida.texto : (opciones[0] ? opciones[0].texto : '')}
          </span>
          <ChevronDown
            aria-hidden
            strokeWidth={2.5}
            className="size-[1.1rem] shrink-0 text-fg-muted"
          />
        </button>
      </div>

      <Popover
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        disparador={disparador}
        ancho={300}
        etiqueta={etiqueta ?? 'Elegir opcion'}
      >
        <div
          role="listbox"
          aria-label={etiqueta}
          className="max-h-72 space-y-0.5 overflow-y-auto p-2"
        >
          {opciones.map((o) => {
            const activa = o.valor === valor
            return (
              <button
                key={o.valor || `__vacia__${o.texto}`}
                type="button"
                role="option"
                aria-selected={activa}
                disabled={o.disabled}
                onClick={() => elegir(o.valor)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm',
                  'transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.98]',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                  'disabled:opacity-40',
                  activa ? 'bg-primary font-semibold text-primary-fg' : 'text-fg hover:bg-surface-2',
                )}
              >
                <span className="min-w-0 flex-1 truncate">{o.texto}</span>
                {activa && <Check className="h-4 w-4 shrink-0" aria-hidden />}
              </button>
            )
          })}
        </div>
      </Popover>
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
          error && POZO_ERROR,
          className,
        )}
        {...props}
      />
    </Envoltura>
  )
})

/**
 * Interruptor. 44px de alto de área táctil aunque el riel se vea más chico.
 *
 * En arcilla el interruptor se explica solo: el riel es un CANAL excavado
 * y la perilla es una pieza que se apoya dentro y corre por él. Es el
 * mismo par pozo/pieza que separa un campo de una tarjeta, aplicado a un
 * control, y por eso no necesita ninguna etiqueta de "on/off" para que se
 * entienda de qué lado está.
 *
 * El color del canal sigue siendo lo que dice el estado —verde violeta
 * encendido, hueco apagado— porque la posición sola no basta para quien
 * no distingue bien la izquierda de la derecha en un riel de 44px.
 */
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
      className="group flex w-full items-center justify-between gap-4 rounded-xl py-2 text-left disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block text-base text-fg">{etiqueta}</span>
        {descripcion && <span className="block text-sm text-fg-subtle">{descripcion}</span>}
      </span>

      {/* El canal. Encendido se llena de color, apagado queda hueco. */}
      <span
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full',
          'transition-[background-color,box-shadow] duration-200 ease-salida',
          activo ? 'bg-primary shadow-pozo' : 'pozo',
        )}
      >
        {/*
          La perilla se pinta contra su canal, no en blanco fijo. Apagada
          el canal es el fondo hondo, que en tema claro es un lila casi
          blanco: una perilla blanca encima daba 1.1:1 y el interruptor
          parecía un riel vacío. Encendida el canal es `primary`, y ahí
          `primary-fg` es el token que ya existe para lo que va montado
          sobre el morado.

          Lleva `arcilla-sutil` para que se lea como pieza apoyada dentro
          del canal y no como un círculo pintado en él. Es la sombra la
          que la mete dentro.
        */}
        <span
          className={cn(
            'absolute top-1 h-5 w-5 rounded-full shadow-arcilla-sutil',
            activo ? 'bg-primary-fg' : 'bg-fg-muted',
            'transition-transform duration-200 ease-salida',
            activo ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </span>
    </button>
  )
}
