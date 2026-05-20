import LeadDetailView from '@/components/modules/LeadDetailView'

interface Props {
  params: { id: string }
}

export default function LeadDetailPage({ params }: Props) {
  return <LeadDetailView leadId={params.id} />
}