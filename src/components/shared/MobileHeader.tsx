'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'

export function MobileHeader() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-[var(--primary)] text-white lg:hidden">
        <div>
          <span className="font-bold text-base">SaaS BI</span>
          <span className="text-white/70 text-xs ml-2">Prefeitura de Araçuaí</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded hover:bg-white/10 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full w-64 shadow-xl">
            <Sidebar onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
