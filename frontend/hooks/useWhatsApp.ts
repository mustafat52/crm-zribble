import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface WaConversation {
  id:            string
  direction:     'outbound' | 'inbound'
  message_id:    string | null
  template_name: string | null
  body:          string | null
  status:        'sent' | 'delivered' | 'read' | 'failed' | 'skipped'
  recipient:     string | null
  sent_at:       string | null
  delivered_at:  string | null
  read_at:       string | null
}

export function useLeadWhatsApp(leadId: string) {
  return useQuery<WaConversation[]>({
    queryKey:      ['lead-whatsapp', leadId],
    queryFn:       () => api.get<WaConversation[]>(`/leads/${leadId}/whatsapp`),
    staleTime:     30_000,
    refetchInterval: 30_000,
  })
}