import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
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
  Video,
  WifiOff,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useRol, NOMBRE_ROL } from '../../hooks/useRol'
import { useTema } from '../../hooks/useTema'
import { useConexion } from '../../hooks/useConexion'
import { Sheet } from '../ui/Sheet'
import { Tutorial } from '../Tutorial'
import { cn } from '../../lib/cn'

type Icono = typeof LayoutDashboard

interface Entrada {
  ruta: string
  etiqueta: string
  icono: Icono
  soloAdmin?: boolean
}

/** Todo el menú, en orden. El sidebar de desktop los muestra todos. */
const ENTRADAS: Entrada[] = [
  { ruta: '/', etiqueta: 'Tablero', icono: LayoutDashboard },
  { ruta: '/leads', etiqueta: 'Leads', icono: Users },
  { ruta: '/trabajos', etiqueta: 'Trabajos', icono: BarChart3 },
  { ruta: '/contenido', etiqueta: 'Contenido', icono: Video },
  { ruta: '/ads', etiqueta: 'Pauta', icono: Megaphone },
  { ruta: '/catalogo', etiqueta: 'Catálogo', icono: Images },
  { ruta: '/config', etiqueta: 'Ajustes', icono: Settings, soloAdmin: true },
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
                    className={cn('relative h-[18px] w-[18px]', isActive && 'text-primary')}
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
      <header className="safe-top sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md md:hidden">
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
          La transición de página es SOLO opacidad, sin desplazamiento.
          En móvil esta caja queda entre dos capas con backdrop-blur —la
          barra superior sticky y la navegación inferior fija, ambas
          md:hidden— y `backdrop-filter` obliga al navegador a componer todo
          lo que tiene debajo. Al animar además un transform aquí, en
          teléfono la composición se quedaba sin repintar: el contenido
          existía y hasta recibía los toques, pero no se dibujaba hasta que
          algo forzaba un repintado (recargar, cambiar de tema, o tocar la
          pantalla). En escritorio no pasa porque ahí esas dos barras no se
          renderizan. Un fundido sin transform se ve casi igual y no crea
          esa capa que entra en conflicto.
        */}
        <AnimatePresence mode="wait">
          <motion.div
            key={ubicacion.pathname}
            /* Sin `initial`: framer pinta la página directamente en su
               estado final, así que el contenido nunca depende de que una
               animación llegue a correr para verse. Solo se anima la SALIDA,
               que con mode="wait" termina antes de que monte la siguiente —
               se sigue percibiendo como una transición, pero si algo falla
               el peor caso es que no haya fundido, no una pantalla vacía. */
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-8"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Navegación inferior en móvil ────────────────────────────── */}
      <nav
        data-tour="nav"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md md:hidden"
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
                  <e.icono className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 1.8} />
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
              <e.icono className="h-5 w-5 text-fg-muted" />
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
