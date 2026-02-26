'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Shield, Plus, Trash2, AlertTriangle, Edit3, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import RiskBadge from '@/components/ui/RiskBadge'
import PageHeader from '@/components/ui/PageHeader'
import { formatAssetType, formatDate, getCIALabel, calculateRiskLevel } from '@/lib/utils'

export default function AssetDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  
  const [asset, setAsset] = useState<any>(null)
  const [vulns, setVulns] = useState<any[]>([])
  const [allVulns, setAllVulns] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [showAddVuln, setShowAddVuln] = useState(false)
  const [selectedVuln, setSelectedVuln] = useState<string>('')
  const [likelihood, setLikelihood] = useState(3)
  const [impact, setImpact] = useState(3)
  const [adding, setAdding] = useState(false)
  const [expandedVuln, setExpandedVuln] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    const supabase = createClient()
    const [assetRes, vulnRes, allVulnRes] = await Promise.all([
      supabase.from('assets').select('*').eq('id', id).single(),
      supabase.from('asset_vulnerabilities').select('*, vulnerability:vulnerabilities(*)').eq('asset_id', id).order('risk_score', { ascending: false }),
      supabase.from('vulnerabilities').select('*').eq('is_active', true).order('owasp_id'),
    ])
    setAsset(assetRes.data)
    setVulns(vulnRes.data || [])
    setAllVulns(allVulnRes.data || [])
    setLoading(false)
  }

  async function handleAddVuln() {
    if (!selectedVuln) return
    setAdding(true)
    const supabase = createClient()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()

      await supabase.from('asset_vulnerabilities').upsert({
        asset_id: id,
        vulnerability_id: selectedVuln,
        organization_id: profile!.organization_id,
        likelihood,
        impact,
        assessed_by: user!.id,
      } as any, { onConflict: 'asset_id,vulnerability_id' })

      setShowAddVuln(false)
      setSelectedVuln('')
      setLikelihood(3)
      setImpact(3)
      loadData()
    } catch (error) {
      console.error('Error adding vulnerability:', error)
    } finally {
      setAdding(false)
    }
  }

  async function handleDeleteVuln(vulnId: string) {
    const supabase = createClient()
    await supabase.from('asset_vulnerabilities').delete().eq('id', vulnId)
    loadData()
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!asset) return <div className="p-8 text-slate-500 text-center">Asset not found.</div>

  const assignedVulnIds = vulns.map(v => v.vulnerability_id)
  const availableVulns = allVulns.filter(v => !assignedVulnIds.includes(v.id))
  const riskPreview = calculateRiskLevel(likelihood, impact)

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <PageHeader
          title={asset.name}
          subtitle={`${formatAssetType(asset.type)} · Added ${formatDate(asset.created_at)}`}
        />
        <div className="flex items-center gap-2 self-start">
          <Link href={`/assets/${id}/edit`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm transition-all">
            <Edit3 className="w-4 h-4" /> Edit
          </Link>
          <Link href="/assets" className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Asset Info & CIA (Col span 4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Asset Info */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Asset Details</h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-y-4 gap-x-2">
              {[
                { label: 'Type', value: formatAssetType(asset.type) },
                { label: 'Owner', value: asset.owner },
                { label: 'Location', value: asset.location },
                { label: 'Vendor', value: asset.vendor },
                { label: 'Version', value: asset.version },
                { label: 'IP Address', value: asset.ip_address },
              ].map(({ label, value }) => value && (
                <div key={label}>
                  <p className="text-[11px] text-slate-600 uppercase">{label}</p>
                  <p className="text-sm text-slate-300 truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CIA Triad */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">CIA Triad</h3>
            <div className="space-y-4">
              {[
                { label: 'Confidentiality', color: 'bg-blue-500', value: asset.confidentiality },
                { label: 'Integrity', color: 'bg-purple-500', value: asset.integrity },
                { label: 'Availability', color: 'bg-cyan-500', value: asset.availability },
              ].map(({ label, color, value }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className="text-xs text-slate-300 font-medium">{value}/5</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${value * 20}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Criticality Score</span>
                  <span className="text-xl font-bold text-white leading-none">{asset.criticality_score}</span>
                </div>
                <RiskBadge level={asset.criticality ?? 'medium'} />
              </div>
            </div>
          </div>

          {asset.notes && (
            <div className="glass rounded-xl p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Notes</h3>
              <p className="text-sm text-slate-400 leading-relaxed italic">"{asset.notes}"</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Vulnerability Assessment (Col span 8) */}
        <div className="lg:col-span-8">
          <div className="glass rounded-xl p-4 md:p-6 h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-400" />
                Vulnerability Assessment
                <span className="ml-1 text-xs bg-slate-800 border border-slate-700 text-slate-500 px-2 py-0.5 rounded-full">{vulns.length}</span>
              </h3>
              <button
                onClick={() => setShowAddVuln(!showAddVuln)}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/30 text-brand-400 text-xs font-medium transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Vulnerability
              </button>
            </div>

            {/* Add vulnerability form */}
            {showAddVuln && (
              <div className="mb-6 p-4 md:p-5 rounded-xl bg-slate-900/60 border border-brand-500/20 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                <h4 className="text-xs font-bold text-brand-400 uppercase">New Assessment</h4>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Select Vulnerability</label>
                  <select
                    value={selectedVuln}
                    onChange={e => setSelectedVuln(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  >
                    <option value="">— Select OWASP vulnerability —</option>
                    {availableVulns.map(v => (
                      <option key={v.id} value={v.id}>{v.owasp_id} · {v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-xs text-slate-500 flex justify-between">
                      Likelihood <span>{likelihood}/5</span>
                    </label>
                    <input type="range" min={1} max={5} value={likelihood} onChange={e => setLikelihood(parseInt(e.target.value))} className="w-full accent-brand-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                    <div className="flex justify-between text-[9px] text-slate-600 font-medium">
                      <span>RARE</span><span>POSSIBLE</span><span>CERTAIN</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs text-slate-500 flex justify-between">
                      Impact <span>{impact}/5</span>
                    </label>
                    <input type="range" min={1} max={5} value={impact} onChange={e => setImpact(parseInt(e.target.value))} className="w-full accent-brand-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                    <div className="flex justify-between text-[9px] text-slate-600 font-medium">
                      <span>MINOR</span><span>MODERATE</span><span>FATAL</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 uppercase">Score</p>
                      <p className="text-lg font-bold text-white">{likelihood * impact}</p>
                    </div>
                    <RiskBadge level={riskPreview} size="sm" />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => setShowAddVuln(false)} className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-300 transition-colors">Cancel</button>
                    <button
                      onClick={handleAddVuln}
                      disabled={!selectedVuln || adding}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {adding ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                      Add Assessment
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* List of vulnerabilities */}
            {vulns.length > 0 ? (
              <div className="space-y-3">
                {vulns.map((item) => (
                  <div key={item.id} className="rounded-xl bg-slate-900/40 border border-slate-800/60 overflow-hidden hover:border-slate-700 transition-all">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer"
                      onClick={() => setExpandedVuln(expandedVuln === item.id ? null : item.id)}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex-shrink-0">
                          <AlertTriangle className={`w-5 h-5 ${
                            item.risk_level === 'critical' ? 'text-red-500' :
                            item.risk_level === 'high' ? 'text-orange-500' :
                            item.risk_level === 'medium' ? 'text-yellow-500' : 'text-green-500'
                          }`} />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-semibold text-slate-200 truncate">{item.vulnerability?.name}</p>
                          <p className="text-[10px] text-slate-600 uppercase tracking-tight">{item.vulnerability?.owasp_id} · {item.vulnerability?.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                        <div className="hidden sm:block text-right">
                          <p className="text-[10px] text-slate-600 leading-none mb-1">RISK SCORE</p>
                          <p className="text-sm text-slate-400 font-bold">{item.risk_score}</p>
                        </div>
                        <RiskBadge level={item.risk_level} size="sm" />
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteVuln(item.id) }}
                          className="p-2 text-slate-700 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {expandedVuln === item.id ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                      </div>
                    </div>

                    {expandedVuln === item.id && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          <div>
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-1">Description</h5>
                            <p className="text-xs text-slate-400 leading-relaxed">{item.vulnerability?.description}</p>
                          </div>
                          {item.vulnerability?.remediation_guidance && (
                            <div className="p-3 rounded-lg bg-brand-500/5 border border-brand-500/10">
                              <h5 className="text-[10px] font-bold text-brand-400 uppercase mb-1">Remediation</h5>
                              <p className="text-xs text-slate-400 leading-relaxed">{item.vulnerability?.remediation_guidance}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center glass rounded-xl border-dashed border-2 border-slate-800">
                <Shield className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                <p className="text-sm text-slate-400 font-medium">No vulnerabilities assessed yet</p>
                <p className="text-xs text-slate-600 mt-1 max-w-[240px] mx-auto">Click "Add Vulnerability" to begin your security assessment for this asset.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}