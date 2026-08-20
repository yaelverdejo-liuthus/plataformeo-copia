import { useState, type ComponentType } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Hammer,
  Images,
  LayoutDashboard,
  LogOut,
  Megaphone,
  HelpCircle,
  MoreHorizontal,
  Moon,
  Settings,
  Sun,
  Users,
  WifiOff,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useRol, NOMBRE_ROL } from '../../hooks/useRol'
import { useTema } from '../../hooks/useTema'
import { useConexion } from '../../hooks/useConexion'
import { Sheet } from '../ui/Sheet'
import { Tutorial } from '../Tutorial'
import { IconoContenido } from '../IconoContenido'
import { cn } from '../../lib/cn'

/**
 * Lo único que el menú le pide a un icono. Se describe por lo que recibe y no
 * como `typeof LayoutDashboard` para que quepan tanto los de lucide como los
 * propios — Contenido usa uno que rota entre TikTok, Instagram y Facebook.
 */
type Icono = ComponentType<{ className?: string; strokeWidth?: number }>

interface Entrada {
  ruta: string
  etiqueta: string
  icono: Icono
  /**
   * Clase de la animación en bucle del icono, definida en index.css. Cada
   * una imita lo que hace la sección. Contenido no lleva: su icono ya se
   * mueve solo, turnándose entre TikTok, Instagram y Facebook.
   */
  anim?: string
  soloAdmin?: boolean
}

/** Todo el menú, en orden. El sidebar de desktop los muestra todos. */
const ENTRADAS: Entrada[] = [
  { ruta: '/', etiqueta: 'Tablero', icono: LayoutDashboard, anim: 'anim-latir' },
  { ruta: '/leads', etiqueta: 'Leads', icono: Users, anim: 'anim-asomarse' },
  { ruta: '/trabajos', etiqueta: 'Trabajos', icono: Hammer, anim: 'anim-martillar' },
  { ruta: '/contenido', etiqueta: 'Contenido', icono: IconoContenido },
  { ruta: '/ads', etiqueta: 'Pauta', icono: Megaphone, anim: 'anim-vocear' },
  { ruta: '/catalogo', etiqueta: 'Catálogo', icono: Images, anim: 'anim-hojear' },
  {
    ruta: '/config',
    etiqueta: 'Ajustes',
    icono: Settings,
    anim: 'anim-engranar',
    soloAdmin: true,
  },
]

/**
 * En móvil solo caben 4 destinos + "Más": apretar 7 iconos en 375px rompe
 * el mínimo de 44px de área táctil. Los 4 fijos son los de captura diaria;
 * el resto vive en el sheet de "Más".
 */
const EN_BARRA = ['/', '/leads', '/trabajos', '/contenido']

export function AppShell() {
  const { perfil, salir } = useAuth()
  const { rol, esAdmin } = useRol()
  const { tema, alternar } = useTema()
  const enLinea = useConexion()
  const ubicacion = useLocation()
  const navegar = useNavigate()
  const [masAbierto, setMasAbierto] = useState(false)
  const [tutorialSolicitado, setTutorialSolicitado] = useState(false)

  function verTutorial() {
    setMasAbierto(false)
    setTutorialSolicitado(true)
  }

  const entradas = ENTRADAS.filter((e) => !e.soloAdmin || esAdmin)
  const barra = entradas.filter((e) => EN_BARRA.includes(e.ruta))
  const enMas = entradas.filter((e) => !EN_BARRA.includes(e.ruta))
  const masActivo = enMas.some((e) => e.ruta === ubicacion.pathname)

  return (
    <div className="min-h-dvh bg-bg">
      {/* ── Sidebar en desktop ──────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface md:flex">
        <div className="px-5 py-6">
          <p className="text-lg font-semibold tracking-tight text-fg">Estudio</p>
          <p className="text-sm text-fg-subtle">Tablero de instrumentos</p>
        </div>

        <nav data-tour="nav" className="flex-1 space-y-0.5 px-3">
          {entradas.map((e) => (
            <NavLink key={e.ruta} to={e.ruta} end={e.ruta === '/'}>
              {({ isActive }) => (
                <span
                  className={cn(
                    'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-base transition-colors duration-150',
                    isActive ? 'text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-activo"
                      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                      className="absolute inset-0 rounded-xl bg-primary/12"
                    />
                  )}
                  <e.icono
                    className={cn(
                      'relative h-[18px] w-[18px]',
                      e.anim,
                      isActive && 'text-primary',
                    )}
                  />
                  <span className="relative">{e.etiqueta}</span>
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {(perfil?.nombre ?? '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{perfil?.nombre ?? '—'}</p>
              <p className="text-xs text-fg-subtle">{rol ? NOMBRE_ROL[rol] : ''}</p>
            </div>
          </div>
          <button
            onClick={verTutorial}
            className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <HelpCircle className="h-4 w-4" />
            Ver tutorial
          </button>

          <div className="mt-1 flex gap-1">
            <button
              onClick={alternar}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              {tema === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {tema === 'dark' ? 'Claro' : 'Oscuro'}
            </button>
            <button
              onClick={() => void salir()}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* ── Barra superior en móvil ─────────────────────────────────── */}
      {/* Opaca y sin desenfoque. Ver la nota larga de <main>: esta barra y la
          navegación de abajo eran las dos capas de `backdrop-filter` que
          dejaban el contenido sin repintar en el teléfono. El desenfoque solo
          se nota sobre un fondo translúcido, así que quitarlo y dejar el color
          sólido es el mismo cambio dicho dos veces. */}
      <header className="safe-top sticky top-0 z-20 border-b border-line bg-bg md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight text-fg">Estudio</span>
            {rol && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-fg-subtle">
                {NOMBRE_ROL[rol]}
              </span>
            )}
          </div>
          <button
            onClick={alternar}
            aria-label="Cambiar tema"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-xl text-fg-muted active:bg-surface-2"
          >
            {tema === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* ── Aviso de sin conexión ───────────────────────────────────── */}
      <AnimatePresence>
        {!enLinea && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sticky top-14 z-20 overflow-hidden md:top-0 md:ml-60"
          >
            <div className="flex items-center gap-2 bg-warn/15 px-4 py-2 text-sm text-warn">
              <WifiOff className="h-4 w-4 shrink-0" />
              Sin conexión — puedes ver lo último cargado, pero no guardar.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Contenido ───────────────────────────────────────────────── */}
      <main className="md:ml-60">
        {/*
          Sin transición de página, y esta vez hasta el final.

          Era un problema de PINTADO, no de lógica: el contenido siempre
          estuvo ahí, con su tamaño y recibiendo los toques, pero el teléfono
          no llegaba a dibujarlo. Por eso cualquier cosa que forzara un
          repintado —cambiar de tema, abrir "Más", o rozar un botón y
          disparar su `hover`— lo hacía aparecer de golpe y completo.

          Se juntaban dos cosas, y las dos solo existen en móvil. Esta caja
          quedaba entre las dos barras con `backdrop-filter` (arriba sticky,
          abajo fija, ambas md:hidden), que obligan al navegador a componer
          todo lo que tienen debajo; y encima se animaba su opacidad en cada
          cambio de ruta, lo que la promueve a capa de composición propia.
          Entre las dos, la capa se quedaba con los píxeles viejos.

          Se notaba solo donde nada se anima al montar. Una lista con
          tarjetas se salva sola: sus entradas escalonadas repintan durante
          200 ms y de paso arrastran la capa. Trabajos sin trabajos activos
          pinta una vez y ya, y ese único pintado era el que se perdía. En
          escritorio no pasa porque ahí esas barras ni se renderizan.

          Ya no hay desenfoque en las barras, así que el conflicto está roto
          por los dos lados. El fundido tampoco vuelve: cambiar de sección
          queda instantáneo, que en el teléfono se siente mejor que 180 ms de
          espera, y ninguna pantalla depende de que algo se anime para verse.
        */}
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-8">
          <Outlet />
        </div>
      </main>

      {/* ── Navegación inferior en móvil ────────────────────────────── */}
      <nav
        data-tour="nav"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface md:hidden"
      >
        <div className="flex">
          {barra.map((e) => (
            <NavLink key={e.ruta} to={e.ruta} end={e.ruta === '/'} className="flex-1">
              {({ isActive }) => (
                <span
                  className={cn(
                    'flex h-16 flex-col items-center justify-center gap-1 transition-colors duration-150',
                    isActive ? 'text-primary' : 'text-fg-subtle',
                  )}
                >
                  <e.icono
                    className={cn('h-[22px] w-[22px]', e.anim)}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  <span className="text-2xs font-medium">{e.etiqueta}</span>
                </span>
              )}
            </NavLink>
          ))}

          <button onClick={() => setMasAbierto(true)} className="flex-1">
            <span
              className={cn(
                'flex h-16 flex-col items-center justify-center gap-1 transition-colors duration-150',
                masActivo ? 'text-primary' : 'text-fg-subtle',
              )}
            >
              <MoreHorizontal className="h-[22px] w-[22px]" strokeWidth={masActivo ? 2.4 : 1.8} />
              <span className="text-2xs font-medium">Más</span>
            </span>
          </button>
        </div>
      </nav>

      <Sheet abierto={masAbierto} onCerrar={() => setMasAbierto(false)} titulo="Más">
        <div className="space-y-1">
          {enMas.map((e) => (
            <button
              key={e.ruta}
              onClick={() => {
                setMasAbierto(false)
                navegar(e.ruta)
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-base text-fg transition-colors active:bg-surface-2"
            >
              <e.icono className={cn('h-5 w-5 text-fg-muted', e.anim)} />
              {e.etiqueta}
            </button>
          ))}

          <button
            onClick={verTutorial}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-base text-fg transition-colors active:bg-surface-2"
          >
            <HelpCircle className="h-5 w-5 text-fg-muted" />
            Ver tutorial
          </button>

          <div className="!mt-4 border-t border-line pt-3">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {(perfil?.nombre ?? '?').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{perfil?.nombre ?? '—'}</p>
                <p className="text-xs text-fg-subtle">{rol ? NOMBRE_ROL[rol] : ''}</p>
              </div>
            </div>
            <button
              onClick={() => void salir()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-base text-danger transition-colors active:bg-surface-2"
            >
              <LogOut className="h-5 w-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </Sheet>

      <Tutorial
        solicitado={tutorialSolicitado}
        onCerrarSolicitado={() => setTutorialSolicitado(false)}
      />
    </div>
  )
}
