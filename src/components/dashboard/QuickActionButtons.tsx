'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function QuickActionButtons() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button asChild>
        <Link href="/orders/new">+ Nova OS</Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/orders">Acompanhar Pedidos</Link>
      </Button>
    </div>
  )
}
