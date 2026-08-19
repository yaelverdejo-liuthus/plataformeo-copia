import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { Ad, AdConVeredicto } from '../tipos'

export const llavesAds = { todo: ['ads'] as const }

/** De la vista: costo por conversación y veredicto los calcula Postgres. */
export function useAds() {
  return useQuery({
    queryKey: llavesAds.todo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_ads_veredicto')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as AdConVeredicto[]
    },
  })
}

export type NuevoAd = Pick<
  Ad,
  'plataforma' | 'creativo' | 'objetivo' | 'presupuesto'
> &
  Partial<Pick<Ad, 'fecha' | 'gasto_real' | 'conversaciones'>>

export function useCrearAd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (fila: NuevoAd) => {
      const { data, error } = await supabase.from('ads').insert(fila).select().single()
      if (error) throw error
      return data as Ad
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: llavesAds.todo })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useEliminarAd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ads').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: llavesAds.todo })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useActualizarAd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: Partial<Ad> }) => {
      const { error } = await supabase.from('ads').update(cambios).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, cambios }) => {
      await qc.cancelQueries({ queryKey: llavesAds.todo })
      const previo = qc.getQueryData<AdConVeredicto[]>(llavesAds.todo)
      qc.setQueryData<AdConVeredicto[]>(llavesAds.todo, (v) =>
        (v ?? []).map((a) => (a.id === id ? { ...a, ...cambios } : a)),
      )
      return { previo }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previo) qc.setQueryData(llavesAds.todo, ctx.previo)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: llavesAds.todo })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
