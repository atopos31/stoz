import { Badge } from '@/components/ui/badge'

interface Props {
  status: string
}

export default function TaskStatusBadge({ status }: Props) {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return { label: 'Completed', variant: 'default' as const, className: 'bg-green-600 hover:bg-green-700' }
      case 'running':
        return { label: 'Running', variant: 'default' as const, className: 'bg-blue-600 hover:bg-blue-700' }
      case 'paused':
        return { label: 'Paused', variant: 'secondary' as const, className: 'bg-yellow-600 hover:bg-yellow-700 text-white' }
      case 'failed':
        return { label: 'Failed', variant: 'destructive' as const, className: '' }
      case 'cancelled':
        return { label: 'Cancelled', variant: 'outline' as const, className: '' }
      case 'pending':
        return { label: 'Pending', variant: 'outline' as const, className: '' }
      default:
        return { label: status, variant: 'outline' as const, className: '' }
    }
  }

  const config = getStatusConfig(status)

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}
