'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle, Zap, Plus, Search, Trash2,
  CheckCircle2, Clock, XCircle, ChevronDown, X, Save,
  Eye, Target, Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { autoGenerateFindings, updateFinding, deleteFinding, createFinding } from '@/lib/actions/findings'
import PageHeader from '@/components/ui/PageHeader'
import type { AuditFinding, FindingSeverity, FindingStatus } from '@/types/phase3'
import { formatDate } from '@/lib/utils'

/* ── CONFIG ──────────────────────────────────────────────────────────────── */

const severityConfig: Record<FindingSeverity, { label: string; color: string; bg: string; border: string; dot: string; barColor: string; lightBg: string; lightBorder: string; lightColor: string }> = {
  critical:      { label: 'Critical',  color: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/30',    dot: 'bg-red-500',    barColor: '#ef4444', lightBg: 'bg-red-50',    lightBorder: 'border-red-200',    lightColor: 'text-red-700'    },
  high:          { label: 'High',      color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/30', dot: 'bg-orange-500', barColor: '#f97316', lightBg: 'bg-orange-50', lightBorder: 'border-orange-200', lightColor: 'text-orange-700' },
  medium:        { label: 'Medium',    color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', dot: 'bg-yellow-500', barColor: '#eab308', lightBg: 'bg-yellow-50', lightBorder: 'border-yellow-200', lightColor: 'text-yellow-700' },
  low:           { label: 'Low',       color: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/30',  dot: 'bg-green-500',  barColor: '#22c55e', lightBg: 'bg-green-50',  lightBorder: 'border-green-200',  lightColor: 'text-green-700'  },
  informational: { label: 'Info',      color: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/30',   dot: 'bg-blue-500',   barColor: '#3b82f6', lightBg: 'bg-blue-50',   lightBorder: 'border-blue-200',   lightColor: 'text-blue-700'   },
}

const statusConfig: Record<FindingStatus, { label: string; icon: any; color: string; lightColor: string }> = {
  open:        { label: 'Open',        icon: AlertTriangle, color: 'text-red-400',     lightColor: 'text-red-600'     },
  in_progress: { label: 'In Progress', icon: Clock,         color: 'text-yellow-400',  lightColor: 'text-yellow-600'  },
  resolved:    { label: 'Resolved',    icon: CheckCircle2,  color: 'text-emerald-400', lightColor: 'text-emerald-600' },
  accepted:    { label: 'Accepted',    icon: Target,        color: 'text-blue-400',    lightColor: 'text-blue-600'    },
  closed:      { label: 'Closed',      icon: XCircle,       color: 'text-slate-400',   lightColor: 'text-slate-500'   },
}

const filterActiveColors: Record<string, string> = {
  all:           'bg-brand-600 border-brand-600 text-white',
  critical:      'bg-red-600 border-red-600 text-white',
  high:          'bg-orange-500 border-orange-500 text-white',
  medium:        'bg-yellow-500 border-yellow-500 text-white',
  low:           'bg-green-600 border-green-600 text-white',
  informational: 'bg-blue-600 border-blue-600 text-white',
  open:          'bg-red-600 border-red-600 text-white',
  in_progress:   'bg-yellow-500 border-yellow-500 text-white',
  resolved:      'bg-emerald-600 border-emerald-600 text-white',
  closed:        'bg-slate-500 border-slate-500 text-white',
}

const sourceLabels: Record<string, string> = {
  risk_assessment: 'Risk',
  checklist: 'Checklist',
  manual: 'Manual',
  ai_generated: 'AI',
}

/* ── SEVERITY BADGE ──────────────────────────────────────────────────────── */

function SeverityBadge({ severity, size = 'md' }: { severity: FindingSeverity; size?: 'sm' | 'md' }) {
  const c = severityConfig[severity]
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${c.lightBg} ${c.lightBorder} ${c.lightColor} ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}>
      <span className={`rounded-full flex-shrink-0 w-1.5 h-1.5 ${c.dot}`} />
      {c.label}
    </span>
  )
}

/* ── STATUS DROPDOWN ─────────────────────────────────────────────────────── */

function StatusDropdown({ value, onChange }: { value: FindingStatus; onChange: (v: FindingStatus) => void }) {
  const [open, setOpen] = useState(false)
  const current = statusConfig[value]
  const Icon = current.icon
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-400 transition-all text-xs shadow-sm"
      >
        <Icon className={`w-3.5 h-3.5 ${current.lightColor}`} />
        <span className="text-slate-600">{current.label}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg z-20 min-w-[148px]">
            {(Object.entries(statusConfig) as [FindingStatus, typeof statusConfig[FindingStatus]][]).map(([status, cfg]) => {
              const SIcon = cfg.icon
              return (
                <button
                  key={status}
                  onClick={() => { onChange(status); setOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${value === status ? 'bg-slate-50 text-slate-800 font-medium' : 'text-slate-600'}`}
                >
                  <SIcon className={`w-3.5 h-3.5 ${cfg.lightColor}`} />
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/* ── CREATE MODAL ────────────────────────────────────────────────────────── */

function CreateFindingModal({ orgId, onClose, onCreated }: { orgId: string; onClose: () => void; onCreated: () => void }) {
  const [assets, setAssets] = useState<any[]>([])
  const [controls, setControls] = useState<any[]>([])
  const [vulns, setVulns] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '',
    severity: 'medium' as FindingSeverity,
    affected_asset_id: '', related_control_id: '', vulnerability_id: '',
    likelihood: '', impact: '',
    recommendation: '', remediation_owner: '', remediation_deadline: '',
  })

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('assets').select('id, name, type').eq('organization_id', orgId).eq('is_active', true),
      supabase.from('iso_controls').select('id, control_id, name').order('control_id'),
      supabase.from('vulnerabilities').select('id, name, owasp_id'),
    ]).then(([a, c, v]) => { setAssets(a.data || []); setControls(c.data || []); setVulns(v.data || []) })
  }, [orgId])

  async function handleSave() {
    if (!form.title.trim() || !form.description.trim()) return
    setSaving(true)
    await createFinding(orgId, {
      title: form.title, description: form.description, severity: form.severity, source: 'manual',
      affected_asset_id: form.affected_asset_id || undefined,
      related_control_id: form.related_control_id || undefined,
      vulnerability_id: form.vulnerability_id || undefined,
      likelihood: form.likelihood ? parseInt(form.likelihood) : undefined,
      impact: form.impact ? parseInt(form.impact) : undefined,
      risk_score: form.likelihood && form.impact ? parseInt(form.likelihood) * parseInt(form.impact) : undefined,
      recommendation: form.recommendation || undefined,
      remediation_owner: form.remediation_owner || undefined,
      remediation_deadline: form.remediation_deadline || undefined,
    })
    setSaving(false); onCreated(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl animate-fade-up">
        {/* Sticky header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
          <h3 className="text-base font-semibold text-slate-800">Add Manual Finding</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="label-dark">Finding Title <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="input-dark" placeholder="e.g., Weak password policy on admin accounts" />
          </div>

          <div>
            <label className="label-dark">Severity</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {(Object.keys(severityConfig) as FindingSeverity[]).map(sev => {
                const c = severityConfig[sev]
                return (
                  <button key={sev} type="button" onClick={() => setForm({ ...form, severity: sev })}
                    className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      form.severity === sev ? `${c.lightBg} ${c.lightBorder} ${c.lightColor}` : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="label-dark">Description <span className="text-red-500">*</span></label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="input-dark h-24 resize-none" placeholder="Describe the finding in detail..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label-dark">Affected Asset</label>
              <select value={form.affected_asset_id} onChange={e => setForm({ ...form, affected_asset_id: e.target.value })} className="input-dark">
                <option value="">— None —</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label-dark">ISO Control</label>
              <select value={form.related_control_id} onChange={e => setForm({ ...form, related_control_id: e.target.value })} className="input-dark">
                <option value="">— None —</option>
                {controls.map(c => <option key={c.id} value={c.id}>{c.control_id} — {c.name.slice(0, 30)}</option>)}
              </select>
            </div>
            <div>
              <label className="label-dark">Vulnerability</label>
              <select value={form.vulnerability_id} onChange={e => setForm({ ...form, vulnerability_id: e.target.value })} className="input-dark">
                <option value="">— None —</option>
                {vulns.map(v => <option key={v.id} value={v.id}>{v.owasp_id} — {v.name.slice(0, 25)}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-dark">Likelihood (1–5)</label>
              <select value={form.likelihood} onChange={e => setForm({ ...form, likelihood: e.target.value })} className="input-dark">
                <option value="">— Select —</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {['Rare','Unlikely','Possible','Likely','Almost Certain'][n-1]}</option>)}
              </select>
            </div>
            <div>
              <label className="label-dark">Impact (1–5)</label>
              <select value={form.impact} onChange={e => setForm({ ...form, impact: e.target.value })} className="input-dark">
                <option value="">— Select —</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {['Negligible','Minor','Moderate','Major','Catastrophic'][n-1]}</option>)}
              </select>
            </div>
          </div>

          {form.likelihood && form.impact && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500">Risk Score:</span>
              <span className="text-lg font-bold text-slate-800">{parseInt(form.likelihood) * parseInt(form.impact)}</span>
              <span className="text-xs text-slate-400">/ 25</span>
            </div>
          )}

          <div>
            <label className="label-dark">Recommendation</label>
            <textarea value={form.recommendation} onChange={e => setForm({ ...form, recommendation: e.target.value })}
              className="input-dark h-20 resize-none" placeholder="Steps to remediate this finding..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-dark">Remediation Owner</label>
              <input type="text" value={form.remediation_owner} onChange={e => setForm({ ...form, remediation_owner: e.target.value })}
                className="input-dark" placeholder="e.g., IT Security Team" />
            </div>
            <div>
              <label className="label-dark">Deadline</label>
              <input type="date" value={form.remediation_deadline} onChange={e => setForm({ ...form, remediation_deadline: e.target.value })} className="input-dark" />
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-sm transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.description.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all disabled:opacity-50">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Create Finding
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── DETAIL DRAWER ───────────────────────────────────────────────────────── */

function FindingDetailDrawer({ finding, onClose, onUpdated }: { finding: AuditFinding; onClose: () => void; onUpdated: () => void }) {
  const [form, setForm] = useState({
    status: finding.status,
    remediation_notes: finding.remediation_notes || '',
    remediation_owner: finding.remediation_owner || '',
    remediation_deadline: finding.remediation_deadline || '',
  })
  const [saving, setSaving] = useState(false)
  const [aiExplain, setAiExplain] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const sev = severityConfig[finding.severity]

  async function handleSave() {
    setSaving(true)
    await updateFinding(finding.id, form)
    setSaving(false); onUpdated(); onClose()
  }

  async function handleAiExplain() {
    setAiLoading(true); setAiExplain(null)
    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Analyze this security audit finding:\n\nTitle: ${finding.title}\nSeverity: ${finding.severity}\nDescription: ${finding.description}\n${finding.recommendation ? `Recommendation: ${finding.recommendation}` : ''}\n\nProvide: 1. Root cause (2-3 sentences) 2. Business impact 3. Step-by-step remediation (3-5 steps) 4. Timeline` }],
          context: null,
        }),
      })
      const data = await res.json()
      setAiExplain(data.message || 'Could not generate explanation.')
    } catch { setAiExplain('Failed to connect to AI. Check your GROQ_API_KEY configuration.') }
    setAiLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Full width on mobile, fixed on sm+ */}
      <div className="w-full sm:w-[540px] bg-white border-l border-slate-200 h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Header with severity left-border */}
        <div className="p-5 md:p-6 border-b border-slate-100 flex-shrink-0" style={{ borderLeftWidth: '4px', borderLeftColor: sev.barColor }}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <SeverityBadge severity={finding.severity} />
              <span className="text-xs text-slate-400 font-mono">{finding.finding_number}</span>
              <span className="text-xs bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded">{sourceLabels[finding.source] || finding.source}</span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-base font-semibold text-slate-800 leading-snug">{finding.title}</h2>
        </div>

        <div className="p-5 md:p-6 space-y-5 flex-1">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</p>
            <p className="text-sm text-slate-600 leading-relaxed">{finding.description}</p>
          </div>

          {(finding.risk_score || finding.likelihood || finding.impact) && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Risk Score', value: finding.risk_score != null ? `${finding.risk_score}/25` : '—', color: sev.lightColor },
                { label: 'Likelihood', value: finding.likelihood != null ? `${finding.likelihood}/5` : '—', color: 'text-slate-700' },
                { label: 'Impact',     value: finding.impact != null ? `${finding.impact}/5` : '—',         color: 'text-slate-700' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* References */}
          <div className="space-y-2">
            {(finding.asset as any) && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 w-20 flex-shrink-0">Asset</span>
                <span className="text-xs text-slate-700">{(finding.asset as any).name}</span>
                <span className="text-xs text-slate-400 ml-auto capitalize">{(finding.asset as any).type}</span>
              </div>
            )}
            {(finding.control as any) && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 w-20 flex-shrink-0">ISO Control</span>
                <span className="text-xs text-brand-600 font-mono">{(finding.control as any).control_id}</span>
                <span className="text-xs text-slate-500 truncate">— {(finding.control as any).name}</span>
              </div>
            )}
            {(finding.vulnerability as any) && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 w-20 flex-shrink-0">Vulnerability</span>
                <span className="text-xs text-orange-600 font-mono">{(finding.vulnerability as any).owasp_id}</span>
                <span className="text-xs text-slate-500 truncate">— {(finding.vulnerability as any).name}</span>
              </div>
            )}
          </div>

          {finding.recommendation && (
            <div className="p-4 rounded-xl bg-brand-50 border border-brand-100">
              <p className="text-xs font-semibold text-brand-600 mb-2">Recommendation</p>
              <p className="text-xs text-slate-600 leading-relaxed">{finding.recommendation}</p>
            </div>
          )}

          {/* AI Analysis */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-emerald-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">AI Analysis</span>
              </div>
              <button onClick={handleAiExplain} disabled={aiLoading}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 text-emerald-700 text-xs font-medium transition-all disabled:opacity-50">
                {aiLoading ? <div className="w-3 h-3 border border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {aiExplain ? 'Regenerate' : 'Analyze'}
              </button>
            </div>
            {aiLoading && (
              <div className="p-4 flex items-center gap-2 text-xs text-emerald-700">
                <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
                Analyzing finding...
              </div>
            )}
            {aiExplain && !aiLoading && (
              <div className="p-4 space-y-1">
                {aiExplain.split('\n').map((line, i) => {
                  if (line.startsWith('## ') || line.startsWith('### ')) return <p key={i} className="text-xs font-bold text-emerald-800 mt-2">{line.replace(/#+\s/, '')}</p>
                  if (line.startsWith('- ') || line.startsWith('• ')) return <p key={i} className="text-xs text-slate-600 flex gap-1.5"><span className="text-emerald-600 flex-shrink-0">•</span>{line.slice(2)}</p>
                  if (line.match(/^\d+\. /)) return <p key={i} className="text-xs text-slate-600 flex gap-1.5"><span className="text-emerald-600 flex-shrink-0 font-mono">{line.match(/^(\d+)/)?.[1]}.</span>{line.replace(/^\d+\. /, '')}</p>
                  if (!line) return <div key={i} className="h-1" />
                  return <p key={i} className="text-xs text-slate-600 leading-relaxed">{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                })}
              </div>
            )}
            {!aiExplain && !aiLoading && (
              <p className="p-4 text-xs text-slate-500">Click Analyze to get AI-powered root cause analysis and a remediation plan.</p>
            )}
          </div>

          {/* Status */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Update Status</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.entries(statusConfig) as [FindingStatus, typeof statusConfig[FindingStatus]][]).map(([status, cfg]) => {
                const Icon = cfg.icon
                return (
                  <button key={status} onClick={() => setForm({ ...form, status })}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-xs ${
                      form.status === status ? 'bg-slate-100 border-slate-300 text-slate-800 font-medium' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                    }`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.lightColor}`} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Remediation */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Remediation Tracking</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-dark">Owner</label>
                <input type="text" value={form.remediation_owner} onChange={e => setForm({ ...form, remediation_owner: e.target.value })} className="input-dark" placeholder="IT Manager" />
              </div>
              <div>
                <label className="label-dark">Deadline</label>
                <input type="date" value={form.remediation_deadline} onChange={e => setForm({ ...form, remediation_deadline: e.target.value })} className="input-dark" />
              </div>
            </div>
            <div>
              <label className="label-dark">Progress Notes</label>
              <textarea value={form.remediation_notes} onChange={e => setForm({ ...form, remediation_notes: e.target.value })}
                className="input-dark h-20 resize-none" placeholder="Actions taken, blockers, current progress..." />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-sm transition-all">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all disabled:opacity-50">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── MAIN PAGE ───────────────────────────────────────────────────────────── */

export default function FindingsPage() {
  const [findings, setFindings] = useState<AuditFinding[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateMsg, setGenerateMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
    if (!profile?.organization_id) { setLoading(false); return }
    setOrgId(profile.organization_id)
    const { data } = await supabase
      .from('audit_findings')
      .select('*, asset:assets(name, type), control:iso_controls(control_id, name), vulnerability:vulnerabilities(name, owasp_id)')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
    setFindings(data as AuditFinding[] || [])
    setLoading(false)
  }, [])

  async function handleAutoGenerate() {
    if (!orgId) return
    setGenerating(true); setGenerateMsg(null)
    const result = await autoGenerateFindings(orgId)
    setGenerating(false)
    if (result.error) {
      setGenerateMsg({ text: `Error: ${result.error}`, type: 'error' })
    } else {
      setGenerateMsg({ text: result.count! > 0 ? `✓ Generated ${result.count} new finding${result.count === 1 ? '' : 's'}.` : 'No new findings — all risks are already captured.', type: 'success' })
      loadData()
    }
    setTimeout(() => setGenerateMsg(null), 6000)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await deleteFinding(id)
    setDeletingId(null)
    setFindings(prev => prev.filter(f => f.id !== id))
  }

  async function handleStatusChange(finding: AuditFinding, status: FindingStatus) {
    await updateFinding(finding.id, { status })
    setFindings(prev => prev.map(f => f.id === finding.id ? { ...f, status } : f))
  }

  const total = findings.length
  const bySeverity = {
    critical: findings.filter(f => f.severity === 'critical').length,
    high: findings.filter(f => f.severity === 'high').length,
    medium: findings.filter(f => f.severity === 'medium').length,
    low: findings.filter(f => f.severity === 'low').length,
    informational: findings.filter(f => f.severity === 'informational').length,
  }
  const byStatus = {
    open: findings.filter(f => f.status === 'open').length,
    in_progress: findings.filter(f => f.status === 'in_progress').length,
    resolved: findings.filter(f => f.status === 'resolved').length,
    accepted: findings.filter(f => f.status === 'accepted').length,
    closed: findings.filter(f => f.status === 'closed').length,
  }

  const filtered = findings.filter(f => {
    const matchSearch = !search ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase()) ||
      (f.finding_number || '').toLowerCase().includes(search.toLowerCase())
    const matchSev    = severityFilter === 'all' || f.severity === severityFilter
    const matchStatus = statusFilter === 'all' || f.status === statusFilter
    return matchSearch && matchSev && matchStatus
  })

  if (loading) return (
    <div className="p-4 md:p-8 flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Audit Findings"
        subtitle={`${total} total · ${bySeverity.critical + bySeverity.high} critical/high · ${byStatus.open} open`}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={handleAutoGenerate} disabled={generating}
              className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium transition-all disabled:opacity-50">
              {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
              <span className="hidden sm:inline">Auto-Generate</span>
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Finding</span>
            </button>
          </div>
        }
      />

      {/* Toast */}
      {generateMsg && (
        <div className={`mb-5 flex items-center gap-3 p-4 rounded-xl border text-sm ${
          generateMsg.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {generateMsg.type === 'error' ? <XCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
          {generateMsg.text}
        </div>
      )}

      {/* Stats — stacked on mobile, side by side on md+ */}
      <div className="flex flex-col md:grid md:grid-cols-12 gap-3 mb-6">
        {/* Severity breakdown */}
        <div className="md:col-span-7 glass rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">By Severity</p>
          <div className="space-y-2">
            {(Object.keys(severityConfig) as FindingSeverity[]).map(sev => {
              const count = bySeverity[sev as keyof typeof bySeverity]
              const pct = total > 0 ? (count / total) * 100 : 0
              const c = severityConfig[sev]
              return (
                <div key={sev} className="flex items-center gap-3">
                  <span className={`text-xs w-20 flex-shrink-0 ${c.lightColor}`}>{c.label}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: c.barColor }} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-6 text-right tabular-nums">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status summary */}
        <div className="md:col-span-5 glass rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">By Status</p>
          <div className="space-y-2">
            {(Object.entries(statusConfig) as [FindingStatus, typeof statusConfig[FindingStatus]][]).map(([status, cfg]) => {
              const count = byStatus[status as keyof typeof byStatus]
              const Icon = cfg.icon
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${cfg.lightColor}`} />
                    <span className="text-xs text-slate-600">{cfg.label}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 tabular-nums">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input-dark pl-10 w-full sm:w-64" placeholder="Search findings..." />
        </div>
        {/* Severity filters */}
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'critical', 'high', 'medium', 'low', 'informational'].map(s => (
            <button key={s} onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                severityFilter === s ? (filterActiveColors[s] || 'bg-brand-600 border-brand-600 text-white') : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'
              }`}>
              {s === 'all' ? 'All Severity' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        {/* Status filters */}
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                statusFilter === s ? (filterActiveColors[s] || 'bg-brand-600 border-brand-600 text-white') : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'
              }`}>
              {s === 'all' ? 'All Status' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Findings list */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(finding => {
            const sev = severityConfig[finding.severity]
            const isOverdue = finding.remediation_deadline &&
              new Date(finding.remediation_deadline) < new Date() &&
              finding.status !== 'resolved' && finding.status !== 'closed'

            return (
              <div key={finding.id} className="glass rounded-xl p-3 md:p-4 card-hover group transition-all"
                style={{ borderLeft: `4px solid ${sev.barColor}` }}>
                <div className="flex items-start gap-3 md:gap-4">
                  {/* Severity + number */}
                  <div className="flex flex-col items-start gap-1 flex-shrink-0 mt-0.5">
                    <SeverityBadge severity={finding.severity} />
                    <span className="text-[10px] font-mono text-slate-400">{finding.finding_number || '—'}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <button onClick={() => setSelectedFinding(finding)} className="text-left w-full">
                      <p className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors leading-snug">{finding.title}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{finding.description}</p>
                    </button>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {(finding.asset as any) && (
                        <span className="text-[11px] bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded">📦 {(finding.asset as any).name}</span>
                      )}
                      {(finding.control as any) && (
                        <span className="text-[11px] bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-mono">{(finding.control as any).control_id}</span>
                      )}
                      {(finding.vulnerability as any) && (
                        <span className="text-[11px] bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-mono">{(finding.vulnerability as any).owasp_id}</span>
                      )}
                      {finding.risk_score != null && <span className="text-[11px] text-slate-400">Risk: {finding.risk_score}/25</span>}
                      <span className="text-[11px] text-slate-400">{formatDate(finding.created_at)}</span>
                      {isOverdue && <span className="text-[11px] text-red-600 font-medium">⚠ Overdue</span>}
                      {finding.remediation_deadline && !isOverdue && finding.status !== 'resolved' && (
                        <span className="text-[11px] text-amber-600">⏰ Due {formatDate(finding.remediation_deadline)}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <StatusDropdown value={finding.status} onChange={s => handleStatusChange(finding, s)} />
                    <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelectedFinding(finding)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all" title="View & edit">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(finding.id)} disabled={deletingId === finding.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50" title="Delete">
                        {deletingId === finding.id
                          ? <div className="w-3.5 h-3.5 border border-red-400/30 border-t-red-500 rounded-full animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass rounded-xl p-12 md:p-16 text-center">
          <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">
            {search || severityFilter !== 'all' || statusFilter !== 'all' ? 'No findings match' : 'No Findings Yet'}
          </h3>
          <p className="text-slate-400 text-sm mb-5">
            {search || severityFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'Auto-generate findings from your risk assessments & ISO checklist, or add them manually.'}
          </p>
          {!search && severityFilter === 'all' && statusFilter === 'all' && (
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button onClick={handleAutoGenerate} disabled={generating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-sm font-medium transition-all disabled:opacity-50">
                <Zap className="w-4 h-4" /> Auto-Generate
              </button>
              <button onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all">
                <Plus className="w-4 h-4" /> Add Manually
              </button>
            </div>
          )}
        </div>
      )}

      {showCreate && orgId && <CreateFindingModal orgId={orgId} onClose={() => setShowCreate(false)} onCreated={loadData} />}
      {selectedFinding && <FindingDetailDrawer finding={selectedFinding} onClose={() => setSelectedFinding(null)} onUpdated={loadData} />}
    </div>
  )
}