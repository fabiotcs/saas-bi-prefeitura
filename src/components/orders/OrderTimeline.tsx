'use client'

export interface TimelineEvent {
  id: string
  step: string
  occurredAt: string
  user: { fullName: string; photoUrl?: string | null }
}

interface OrderTimelineProps {
  events: TimelineEvent[]
}

const STEP_LABELS: Record<string, string> = {
  CREATED: 'Criada',
  QUOTATION_OPENED: 'Cotação Aberta',
  QUOTATION_CLOSED: 'Cotação Fechada',
  APPROVED: 'Aprovada',
  DELIVERED: 'Entregue',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
}

const STEP_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-500',
  QUOTATION_OPENED: 'bg-yellow-500',
  QUOTATION_CLOSED: 'bg-orange-500',
  APPROVED: 'bg-green-500',
  DELIVERED: 'bg-purple-500',
  COMPLETED: 'bg-teal-500',
  CANCELLED: 'bg-red-500',
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OrderTimeline({ events }: OrderTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Nenhum evento registrado na linha do tempo.
      </p>
    )
  }

  return (
    <ol className="relative border-l border-gray-200 dark:border-gray-700">
      {events.map((event, index) => {
        const bulletColor = STEP_COLORS[event.step] ?? 'bg-gray-400'
        const label = STEP_LABELS[event.step] ?? event.step
        const initial = event.user.fullName.charAt(0).toUpperCase()

        return (
          <li key={event.id} className={`ml-6 ${index < events.length - 1 ? 'mb-6' : ''}`}>
            {/* Bullet */}
            <span
              className={`absolute -left-[11px] flex h-[22px] w-[22px] items-center justify-center rounded-full ring-4 ring-white dark:ring-gray-900 ${bulletColor}`}
              aria-hidden="true"
            />

            <div className="flex items-start gap-3">
              {/* Avatar */}
              {event.user.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.user.photoUrl}
                  alt={event.user.fullName}
                  className="h-8 w-8 rounded-full object-cover flex-shrink-0 ring-2 ring-gray-200"
                />
              ) : (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold ring-2 ring-gray-200">
                  {initial}
                </div>
              )}

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {event.user.fullName}
                </p>
                <time className="block text-xs text-muted-foreground mt-0.5">
                  {formatDateTime(event.occurredAt)}
                </time>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default OrderTimeline
