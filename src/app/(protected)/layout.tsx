import { Sidebar } from '@/components/shared/Sidebar'
import { MobileHeader } from '@/components/shared/MobileHeader'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header with hamburger */}
        <MobileHeader />

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 xl:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
