'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Shield, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import RiskBadge from '@/components/ui/RiskBadge'
import PageHeader from '@/components/ui/PageHeader'
import { formatAssetType } from '@/lib/utils'
import type { Asset, Vulnerability, AssetVulnerability } from '@/types/models'

type RiskItem = AssetVulnerability & { vulnerability: Vulnerability; asset: Asset }

const MATRIX_LABELS_X = ['Rare (1)', 'Unlikely (2)', 'Possible (3)', 'Likely (4)', 'Certain (5)']
const MATRIX_LABELS_Y = ['Catastrophic (5)', 'Major (4)', 'Moderate (3)', 'Minor (2)', 'Negligible (1)']

function getRiskMatrixCell(likelihood: number, impact: number): string {
  const score = likelihood * impact
  if (score >= 20) return 'bg-red-500/80 border-red-500/50'
  if (score >= 12) return 'bg-orange-500/70 border-orange-500/50'
  if (score >= 6)  return 'bg-yellow-500/60 border-yellow-500/50'
  if (score >= 2)  return 'bg-green-600/50 border-green-600/50'
  return 'bg-slate-200/80 border-slate-300/50'
}

const filterActiveColors: Record<string, string> = {
  all:      'bg-brand-600 border-brand-600 text-white',
  critical: 'bg-red-600 border-red-600 text-white',
  high:     'bg-orange-500 border-orange-500 text-white',
  medium:   'bg-yellow-500 border-yellow-500 text-white',
  low:      'bg-green-600 border-green-600 text-white',
}

export default function RiskPage() {
  const [items, setItems] = useState<RiskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => { loadRisks() }, [])

  async function loadRisks() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
    if (!profile?.organization_id) { setLoading(false); return }

    const { data } = await supabase
      .from('asset_vulnerabilities')
      .select('*, vulnerability:vulnerabilities(*), asset:assets(*)')
      .eq('organization_id', profile.organization_id)
      .order('risk_score', { ascending: false })

    setItems(data as RiskItem[] || [])
    setLoading(false)
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.risk_level === filter)

  const stats = {
    critical: items.filter(i => i.risk_level === 'critical').length,
    high:     items.filter(i => i.risk_level === 'high').length,
    medium:   items.filter(i => i.risk_level === 'medium').length,
    low:      items.filter(i => i.risk_level === 'low').length,
  }

  const matrixData = Array.from({ length: 5 }, (_, impact) =>
    Array.from({ length: 5 }, (_, likelihood) => {
      const l = likelihood + 1
      const i = 5 - impact
      return items.filter(item => item.likelihood === l && item.impact === i)
    })
  )

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-96">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Risk Matrix"
        subtitle={`${items.length} total risk items across ${new Set(items.map(i => i.asset_id)).size} assets`}
      />

      {/* Summary stats — 2 cols mobile, 4 cols md+ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 md:mb-8">
        {[
          { label: 'Critical', count: stats.critical, color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
          { label: 'High',     count: stats.high,     color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
          { label: 'Medium',   count: stats.medium,   color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
          { label: 'Low',      count: stats.low,      color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
        ].map(({ label, count, color, bg, border }) => (
          <div key={label} className={`rounded-xl p-4 text-center border ${bg} ${border}`}>
            <p className={`text-2xl md:text-3xl font-bold tabular-nums ${color}`}>{count}</p>
            <p className="text-xs text-slate-500 mt-1">{label} Risk</p>
          </div>
        ))}
      </div>

      {/* Heatmap + Overview — stacked mobile, side-by-side lg+ */}
      <div className="flex flex-col lg:grid lg:grid-cols-5 gap-4 md:gap-6 mb-6">

        {/* Risk Matrix Heatmap */}
        <div className="lg:col-span-3 glass rounded-xl p-4 md:p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-500" />
            Risk Heatmap (Likelihood × Impact)
          </h3>

          <div className="overflow-x-auto">
            <div className="min-w-[320px]">
              {/* X-axis labels */}
              <div className="flex mb-1 ml-12">
                {MATRIX_LABELS_X.map((label, i) => (
                  <div key={i} className="flex-1 text-center">
                    <span className="text-[8px] md:text-[9px] text-slate-500 leading-tight">{label}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-1">
                {/* Y-axis labels */}
                <div className="flex flex-col gap-1 w-11 flex-shrink-0">
                  {MATRIX_LABELS_Y.map((label, i) => (
                    <div key={i} className="h-10 md:h-12 flex items-center justify-end pr-1">
                      <span className="text-[7px] md:text-[8px] text-slate-500 text-right leading-tight">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Matrix cells */}
                <div className="flex-1">
                  {matrixData.map((row, impactIdx) => (
                    <div key={impactIdx} className="flex gap-1 mb-1">
                      {row.map((cellItems, likelihoodIdx) => (
                        <div
                          key={likelihoodIdx}
                          className={`flex-1 h-10 md:h-12 rounded-lg border flex items-center justify-center transition-all cursor-default ${getRiskMatrixCell(likelihoodIdx + 1, 5 - impactIdx)}`}
                          title={`L:${likelihoodIdx + 1} × I:${5 - impactIdx} = ${(likelihoodIdx + 1) * (5 - impactIdx)}`}
                        >
                          {cellItems.length > 0 && (
                            <span className="text-white text-xs font-bold drop-shadow">{cellItems.length}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 ml-11">
                {[
                  { label: 'Critical (≥20)', color: 'bg-red-500' },
                  { label: 'High (12-19)',   color: 'bg-orange-500' },
                  { label: 'Medium (6-11)',  color: 'bg-yellow-500' },
                  { label: 'Low (2-5)',      color: 'bg-green-600' },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${color}`} />
                    <span className="text-[10px] text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Risk Overview */}
        <div className="lg:col-span-2 glass rounded-xl p-4 md:p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Risk Overview</h3>
          {items.length > 0 ? (
            <div className="space-y-3">
              {['critical', 'high', 'medium', 'low', 'negligible'].map(level => {
                const count = items.filter(i => i.risk_level === level).length
                const pct = items.length ? (count / items.length * 100) : 0
                const colors: Record<string, string> = {
                  critical: 'bg-red-500', high: 'bg-orange-500',
                  medium: 'bg-yellow-500', low: 'bg-green-500', negligible: 'bg-slate-400',
                }
                return (
                  <div key={level}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize text-slate-500">{level}</span>
                      <span className="text-slate-700 font-medium">{count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[level]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No risks yet. Add vulnerabilities to assets.</p>
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-3">Top Risk Items</p>
              <div className="space-y-2">
                {items.slice(0, 4).map(item => (
                  <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <RiskBadge level={item.risk_level ?? 'negligible'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-700 truncate">{item.vulnerability?.name}</p>
                      <p className="text-[10px] text-slate-400">{(item.asset as any)?.name}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-500 tabular-nums">{item.risk_score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Risk Table */}
      <div className="glass rounded-xl overflow-hidden">
        {/* Header — stacked on mobile */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            All Risk Items
          </h3>
          <div className="flex flex-wrap gap-2">
            {['all', 'critical', 'high', 'medium', 'low'].map(level => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  filter === level
                    ? filterActiveColors[level]
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table-dark min-w-[560px]">
              <thead>
                <tr>
                  <th>Vulnerability</th>
                  <th>Affected Asset</th>
                  <th className="hidden md:table-cell">Likelihood</th>
                  <th className="hidden md:table-cell">Impact</th>
                  <th>Score</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-medium text-slate-700">{item.vulnerability?.name}</p>
                      <p className="text-xs text-slate-400">{item.vulnerability?.owasp_id}</p>
                    </td>
                    <td>
                      <p className="text-slate-600">{(item.asset as any)?.name}</p>
                      <p className="text-xs text-slate-400">{formatAssetType((item.asset as any)?.type)}</p>
                    </td>
                    <td className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={`w-2 h-4 rounded-sm ${i <= item.likelihood ? 'bg-brand-500' : 'bg-slate-200'}`} />
                          ))}
                        </div>
                        <span className="text-xs text-slate-400 tabular-nums">{item.likelihood}/5</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={`w-2 h-4 rounded-sm ${i <= item.impact ? 'bg-orange-500' : 'bg-slate-200'}`} />
                          ))}
                        </div>
                        <span className="text-xs text-slate-400 tabular-nums">{item.impact}/5</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-lg font-bold text-slate-700 tabular-nums">{item.risk_score}</span>
                      <span className="text-xs text-slate-400 ml-1">/25</span>
                    </td>
                    <td>
                      <RiskBadge level={item.risk_level ?? 'negligible'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {filter === 'all' ? 'No risk assessments yet. Add vulnerabilities to assets.' : `No ${filter} risk items.`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}