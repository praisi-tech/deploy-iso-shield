'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CIASlider from '@/components/ui/CIASlider'
import PageHeader from '@/components/ui/PageHeader'

const assetTypes = [
  { value: 'hardware', label: '🖥️ Hardware', desc: 'Physical devices, servers, workstations' },
  { value: 'software', label: '💿 Software', desc: 'Applications, OS, firmware' },
  { value: 'data', label: '📁 Data', desc: 'Databases, files, documents' },
  { value: 'service', label: '⚡ Service', desc: 'Cloud services, APIs, utilities' },
  { value: 'personnel', label: '👤 Personnel', desc: 'People with system access' },
  { value: 'facility', label: '🏢 Facility', desc: 'Physical locations, data centers' },
]

export default function NewAssetPage() {
  const router = useRouter()
  const [loading, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'software',
    owner: '',
    location: '',
    ip_address: '',
    version: '',
    vendor: '',
    confidentiality: 3,
    integrity: 3,
    availability: 3,
    notes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
    if (!profile?.organization_id) { setError('No organization found. Please set up your organization first.'); setSaving(false); return }

    const { data, error: err } = await supabase.from('assets').insert({
      ...form,
      organization_id: profile.organization_id,
      created_by: user.id,
    }).select().single()

    if (err) { setError(err.message); setSaving(false); return }
    router.push(`/assets/${data.id}`)
  }

  // Compute criticality preview
  const score = (form.confidentiality * 0.4 + form.integrity * 0.35 + form.availability * 0.25).toFixed(2)
  const criticality = parseFloat(score) >= 4 ? 'Critical' : parseFloat(score) >= 3 ? 'High' : parseFloat(score) >= 2 ? 'Medium' : 'Low'
  const critColor = { Critical: 'text-red-400', High: 'text-orange-400', Medium: 'text-yellow-400', Low: 'text-green-400' }[criticality]

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Add New Asset"
        subtitle="Register an IT asset to the inventory for risk assessment"
        actions={
          <Link href="/assets" className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Assets
          </Link>
        }
      />

      {error && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-5">Asset Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label-dark">Asset Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                className="input-dark"
                placeholder="e.g., Main Database Server, Customer Web Portal"
              />
            </div>
            <div className="col-span-2">
              <label className="label-dark">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="input-dark h-20 resize-none"
                placeholder="Brief description of the asset..."
              />
            </div>
          </div>
        </div>

        {/* Asset Type */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Asset Type *</h3>
          <div className="grid grid-cols-3 gap-2">
            {assetTypes.map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm({ ...form, type: value })}
                className={`p-3 rounded-xl text-left border transition-all ${
                  form.type === value
                    ? 'bg-brand-500/15 border-brand-500/40'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <p className="text-sm mb-0.5">{label}</p>
                <p className="text-[11px] text-slate-600">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-5">Asset Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-dark">Owner / Responsible</label>
              <input type="text" value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} className="input-dark" placeholder="IT Department / John Doe" />
            </div>
            <div>
              <label className="label-dark">Location</label>
              <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input-dark" placeholder="Data Center A / Cloud AWS" />
            </div>
            <div>
              <label className="label-dark">Vendor / Manufacturer</label>
              <input type="text" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} className="input-dark" placeholder="Microsoft, AWS, Oracle..." />
            </div>
            <div>
              <label className="label-dark">Version</label>
              <input type="text" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} className="input-dark" placeholder="e.g., 14.0.1, v2.3" />
            </div>
            <div>
              <label className="label-dark">IP Address</label>
              <input type="text" value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })} className="input-dark" placeholder="192.168.1.100" />
            </div>
          </div>
        </div>

        {/* CIA Triad */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-300">CIA Triad Rating</h3>
            <div className="text-right">
              <p className="text-xs text-slate-600">Criticality Score</p>
              <p className={`text-lg font-bold ${critColor}`}>{score} — {criticality}</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mb-6">Rate the importance of each security attribute for this asset.</p>

          <div className="space-y-6">
            <CIASlider
              label="Confidentiality (C)"
              name="confidentiality"
              value={form.confidentiality}
              onChange={v => setForm({ ...form, confidentiality: v })}
              description="How sensitive is this asset's data? What's the impact if unauthorized access occurs?"
            />
            <CIASlider
              label="Integrity (I)"
              name="integrity"
              value={form.integrity}
              onChange={v => setForm({ ...form, integrity: v })}
              description="How critical is data accuracy? What's the impact if data is modified or corrupted?"
            />
            <CIASlider
              label="Availability (A)"
              name="availability"
              value={form.availability}
              onChange={v => setForm({ ...form, availability: v })}
              description="How critical is uptime? What's the impact if the asset becomes unavailable?"
            />
          </div>

          <div className="mt-5 p-4 rounded-lg bg-slate-900/60 border border-slate-800">
            <p className="text-xs text-slate-500 font-medium mb-2">Score Formula</p>
            <p className="text-xs text-slate-600 font-mono">
              ({form.confidentiality} × 0.4) + ({form.integrity} × 0.35) + ({form.availability} × 0.25) = <span className={`font-bold ${critColor}`}>{score}</span>
            </p>
          </div>
        </div>

        {/* Notes */}
        <div className="glass rounded-xl p-6">
          <label className="label-dark">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            className="input-dark h-24 resize-none"
            placeholder="Any additional notes, dependencies, or context..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/assets" className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm transition-all">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all disabled:opacity-50"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Create Asset
          </button>
        </div>
      </form>
    </div>
  )
}
