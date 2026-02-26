import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Server, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import RiskBadge from '@/components/ui/RiskBadge'
import { formatAssetType, formatDate } from '@/lib/utils'

const assetTypeIcons: Record<string, string> = {
  hardware: '🖥️',
  software: '💿',
  data: '📁',
  service: '⚡',
  personnel: '👤',
  facility: '🏢',
}

export default async function AssetsPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
    
  if (!profile?.organization_id) redirect('/organization')

  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const assetList = assets || []

  const stats = {
    total: assetList.length,
    critical: assetList.filter(a => a.criticality === 'critical').length,
    high: assetList.filter(a => a.criticality === 'high').length,
    medium: assetList.filter(a => a.criticality === 'medium').length,
    low: assetList.filter(a => a.criticality === 'low').length,
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Asset Inventory"
        subtitle={`${stats.total} assets tracked · ${stats.critical} critical`}
        actions={
          <Link
            href="/assets/new"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-500/25 active:scale-95 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Add New Asset
          </Link>
        }
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Critical', value: stats.critical, color: 'text-red-400' },
          { label: 'High', value: stats.high, color: 'text-orange-400' },
          { label: 'Medium', value: stats.medium, color: 'text-yellow-400' },
          { label: 'Low', value: stats.low, color: 'text-green-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-2xl p-4 text-center border border-white/[0.08] bg-white/[0.03]">
            <p className={`text-xl md:text-2xl font-black ${color} tabular-nums`}>{value}</p>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">{label}</p>
          </div>
        ))}
      </div>

      {/* Table Section */}
      {assetList.length > 0 ? (
        <div className="glass rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.01]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-white/[0.04] border-b border-white/[0.08]">
                <tr className="text-slate-400 text-[10px] uppercase font-bold tracking-[0.15em]">
                  <th className="px-6 py-5">Asset Name</th>
                  <th className="px-6 py-5">Classification</th>
                  <th className="px-6 py-5">Custodian</th>
                  <th className="px-6 py-5">CIA Matrix</th>
                  <th className="px-6 py-5">Criticality</th>
                  <th className="px-6 py-5">Location</th>
                  <th className="px-6 py-5">Onboarded</th>
                  <th className="px-6 py-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {assetList.map((asset) => (
                  <tr key={asset.id} className="group hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl flex-shrink-0">{assetTypeIcons[asset.type] || '📦'}</span>
                        <div className="min-w-0">
                          {/* CHANGED: text-slate-600 for a sophisticated grey look */}
                          <p className="font-bold text-slate-600 text-sm truncate max-w-[180px]">
                            {asset.name}
                          </p>
                          {asset.vendor && (
                            <p className="text-[11px] text-slate-400 font-medium truncate">
                              {asset.vendor}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold bg-slate-400/10 border border-slate-400/20 px-2.5 py-1 rounded-lg text-slate-300 uppercase tracking-tight whitespace-nowrap">
                        {formatAssetType(asset.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 font-medium whitespace-nowrap">
                      {asset.owner || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-end gap-1 h-5">
                          {['C', 'I', 'A'].map((label, i) => {
                            const val = [asset.confidentiality, asset.integrity, asset.availability][i]
                            const colors = ['bg-blue-500', 'bg-purple-500', 'bg-cyan-500']
                            return (
                              <div key={label} className="flex flex-col items-center gap-0.5">
                                <div 
                                  className={`w-1.5 rounded-t-sm ${colors[i]} opacity-90`} 
                                  style={{ height: `${(val / 5) * 100}%`, minHeight: '3px' }} 
                                />
                                <span className="text-[8px] text-slate-600 font-black">{label}</span>
                              </div>
                            )
                          })}
                        </div>
                        <span className="text-xs text-slate-400 font-mono font-bold">
                          {(asset.criticality_score ?? 0).toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RiskBadge level={asset.criticality ?? 'medium'} />
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs font-medium">
                      {asset.location || 'Cloud'}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-[11px] font-medium">
                      {asset.created_at ? formatDate(asset.created_at) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/assets/${asset.id}`}
                        className="p-2 hover:bg-indigo-500/20 rounded-xl inline-flex items-center text-indigo-400 transition-all group-hover:translate-x-1"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="lg:hidden py-3 px-6 bg-black/40 text-center border-t border-white/[0.08]">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
              ← Swipe to view details →
            </p>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 md:p-24 text-center border border-white/[0.08]">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Server className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-3">Inventory is Empty</h3>
          <p className="text-slate-400 text-sm mb-10 max-w-sm mx-auto leading-relaxed">
            Your organization hasn't tracked any assets yet. Assets are the foundation of your ISO 27001 risk management.
          </p>
          <Link
            href="/assets/new"
            className="inline-flex items-center gap-3 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-xl shadow-indigo-600/30"
          >
            <Plus className="w-5 h-5" />
            Add Your First Asset
          </Link>
        </div>
      )}
    </div>
  )
}