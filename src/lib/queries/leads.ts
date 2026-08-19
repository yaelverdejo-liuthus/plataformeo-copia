import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { Lead } from '../tipos'

export const llavesLeads = { todo: ['leads'] as const }

export function useLeads() {
  return useQuery({
    queryKey: llavesLeads.todo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Lead[]
    },
  })
}

export type NuevoLead = Pick<Lead, 'nombre' | 'whatsapp' | 'origen'> &
  Partial<Pick<Lead, 'que_pidio' | 'nivel_estimado' | 'estatus' | 'siguiente_accion' | 'fecha_seguimiento' | 'fecha'>>

export function useCrearLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (lead: NuevoLead) => {
      const { data: sesion } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('leads')
        .insert({ ...lead, created_by: sesion.user?.id ?? null })
        .select()
        .single()
      if (error) throw error
      return data as Lead
    },
    // Optimistic: la captura debe sentirse instantánea (§3.1 del brief).
    onMutate: async (lead) => {
      await qc.cancelQueries({ queryKey: llavesLeads.todo })
      const previo = qc.getQueryData<Lead[]>(llavesLeads.todo)
      const provisional = {
        ...lead,
        id: `provisional-${Date.now()}`,
        fecha: lead.fecha ?? new Date().toISOString().slice(0, 10),
        estatus: lead.estatus ?? 'nuevo',
        que_pidio: lead.que_pidio ?? null,
        nivel_estimado: lead.nivel_estimado ?? null,
        siguiente_accion: lead.siguiente_accion ?? null,
        fecha_seguimiento: lead.fecha_seguimiento ?? null,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Lead
      qc.setQueryData<Lead[]>(llavesLeads.todo, (v) => [provisional, ...(v ?? [])])
      return { previo }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previo) qc.setQueryData(llavesLeads.todo, ctx.previo)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: llavesLeads.todo })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

/**
 * Un lead ya convertido en trabajo no se puede borrar: lo detiene
 * trabajos_lead_id_fkey. El mensaje lo traduce `mensajeDeError`.
 */
export function useEliminarLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: llavesLeads.todo })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useActualizarLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: Partial<Lead> }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(cambios)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Lead
    },
    onMutate: async ({ id, cambios }) => {
      await qc.cancelQueries({ queryKey: llavesLeads.todo })
      const previo = qc.getQueryData<Lead[]>(llavesLeads.todo)
      qc.setQueryData<Lead[]>(llavesLeads.todo, (v) =>
        (v ?? []).map((l) => (l.id === id ? { ...l, ...cambios } : l)),
      )
      return { previo }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previo) qc.setQueryData(llavesLeads.todo, ctx.previo)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: llavesLeads.todo })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
