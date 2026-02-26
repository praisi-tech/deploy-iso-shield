'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Shield, LayoutDashboard, Building2, Server, BarChart3,
  ClipboardList, FolderOpen, PieChart, AlertTriangle,
  FileText, Menu, X
} from 'lucide-react'
import { useState, useEffect } from 'react'

const NAV_SECTIONS = [
  {
    label: 'Setup',
    items: [
      { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
      { href: '/organization', label: 'Organization', icon: Building2 },
      { href: '/assets',       label: 'Assets',       icon: Server },
    ],
  },
  {
    label: 'Risk Assessment',
    items: [
      { href: '/risk',         label: 'Risk Matrix',  icon: BarChart3 },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { href: '/checklist',  label: 'ISO Checklist', icon: ClipboardList },
      { href: '/evidence',   label: 'Evidence',      icon: FolderOpen },
      { href: '/compliance', label: 'Compliance',    icon: PieChart },
    ],
  },
  {
    label: 'Audit',
    items: [
      { href: '/findings', label: 'Findings',     icon: AlertTriangle },
      { href: '/report',   label: 'Audit Report', icon: FileText },
    ],
  },
]

const PHASE_ACCENT = [
  { bg: 'rgba(99,102,241,0.14)',  border: 'rgba(99,102,241,0.26)',  text: '#c7d2fe', icon: '#a5b4fc', dot: '#818cf8' }, // indigo
  { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.24)',  text: '#a7f3d0', icon: '#6ee7b7', dot: '#34d399' }, // emerald
  { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.22)',  text: '#fde68a', icon: '#fcd34d', dot: '#f59e0b' }, // amber
  { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.22)',   text: '#fecaca', icon: '#fca5a5', dot: '#f87171' }, // red
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close sidebar when clicking a link (mobile) or resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
  }, [open])

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  function NavItem({
    href, label, Icon, accent,
  }: {
    href: string
    label: string
    Icon: React.ElementType
    accent: typeof PHASE_ACCENT[0]
  }) {
    const active = isActive(href)

    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        className="group flex items-center gap-3 px-3 py-[10px] rounded-xl text-[13px] font-medium transition-all duration-200"
        style={
          active
            ? {
                background: accent.bg,
                border: `1px solid ${accent.border}`,
                color: accent.text,
                boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
              }
            : { color: 'rgba(255,255,255,0.32)', border: '1px solid transparent' }
        }
      >
        <Icon
          className="w-[16px] h-[16px] flex-shrink-0 transition-colors duration-200"
          style={{ color: active ? accent.icon : 'inherit' }}
        />
        <span className={`flex-1 truncate ${active ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}>
          {label}
        </span>
        {active && (
          <span
            className="w-[6px] h-[6px] rounded-full flex-shrink-0"
            style={{ background: accent.dot, boxShadow: `0 0 8px ${accent.dot}` }}
          />
        )}
      </Link>
    )
  }

  function SidebarContent() {
    return (
      <div className="flex flex-col h-full select-none overflow-hidden">
        {/* Logo Section */}
        <div className="px-5 pt-6 pb-5">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3.5 group"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:rotate-[10deg] group-hover:scale-110"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.2))',
                border: '1px solid rgba(139,92,246,0.32)',
                boxShadow: '0 0 18px rgba(139,92,246,0.18)',
              }}
            >
              <Shield className="w-5 h-5" style={{ color: '#c4b5fd' }} />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold leading-tight tracking-tight" style={{ color: '#eef0fa' }}>
                ISO Shield
              </p>
              <p className="text-[10px] mt-0.5 font-medium uppercase tracking-wider" style={{ color: '#566a94' }}>
                Compliance Engine
              </p>
            </div>
          </Link>
        </div>

        <div className="mx-5 mb-4" style={{ height: '1px', background: 'rgba(255,255,255,0.04)' }} />

        {/* Navigation */}
        <nav className="flex-1 px-3 overflow-y-auto custom-scrollbar pb-4 space-y-6">
          {NAV_SECTIONS.map(({ label, items }, sIdx) => (
            <div key={label} className="space-y-1.5">
              <div className="flex items-center gap-3 px-3 mb-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: 'rgba(255,255,255,0.12)' }}
                >
                  {label}
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.03)' }} />
              </div>

              <div className="space-y-[3px]">
                {items.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    Icon={item.icon}
                    accent={PHASE_ACCENT[sIdx]}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Status */}
        <div className="p-4 border-t border-white/[0.04] bg-black/10">
          <div
            className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 hover:bg-white/[0.04]"
            style={{
              background: 'rgba(255,255,255,0.015)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40"
                style={{ background: '#10b981' }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: '#10b981' }}
              />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                ISO 27001:2022
              </p>
              <p className="text-[10px] mt-0.5 leading-none font-medium" style={{ color: '#34d399' }}>
                Active Audit Session
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="lg:hidden fixed top-5 left-5 z-[45] w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
        style={{
          background: 'rgba(26,32,53,0.9)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#eef0fa',
          backdropFilter: 'blur(16px)',
        }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Overlay */}
      <div
        onClick={() => setOpen(false)}
        className={`lg:hidden fixed inset-0 z-[55] bg-black/70 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Mobile Drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-[60] w-72 flex-shrink-0 transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
          open ? 'translate-x-0' : '-translate-x-full'
        } shadow-2xl border-r border-white/[0.05]`}
        style={{ background: 'linear-gradient(170deg, #1a2035 0%, #131829 55%, #0e1118 100%)' }}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-6 right-5 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:rotate-90 hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex w-60 xl:w-64 flex-shrink-0 h-screen sticky top-0 flex-col border-r border-white/[0.03]"
        style={{ background: 'linear-gradient(170deg, #1a2035 0%, #131829 55%, #0e1118 100%)' }}
      >
        <SidebarContent />
      </aside>

      {/* Global Style for the custom scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </>
  )
}