'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, AlertCircle, Trash2, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CIASlider from '@/components/ui/CIASlider'
import PageHeader from '@/components/ui/PageHeader'

// Asset type definitions matching the database schema
type AssetType = 'hardware' | 'software' | 'data' | 'service' | 'personnel' | 'facility'

const assetTypes: { value: AssetType; label: string; desc: string }[] = [
  { value: 'hardware', label: '🖥️ Hardware', desc: 'Physical devices, servers' },
  { value: 'software', label: '💿 Software', desc: 'Apps, OS, firmware' },
  { value: 'data', label: '📁 Data', desc: 'Databases, documents' },
  { value: 'service', label: '⚡ Service', desc: 'Cloud, APIs, utilities' },
  { value: 'personnel', label: '👤 Personnel', desc: 'Key staff and access' },
  { value: 'facility', label: '🏢 Facility', desc: 'Physical locations' },
]

interface FormState {
  name: string
  description: string
  type: AssetType
  owner: string
  location: string
  ip_address: string
  version: string
  vendor: string
  confidentiality: number
  integrity: number
  availability: number
  notes: string
}

export default function EditAssetPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState<FormState>({
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

  useEffect(() => {
    loadAsset()
  }, [id])

  async function loadAsset() {
    const supabase = createClient()
    const { data, error } = await supabase.from('assets').select('*').eq('id', id).single()
    
    if (error || !data) {
      setError('Asset not found.')
      setLoading(false)
      return
    }

    setForm({
      name: data.name || '',
      description: data.description || '',
      type: (data.type as AssetType) || 'software',
      owner: data.owner || '',
      location: data.location || '',
      ip_address: data.ip_address || '',
      version: data.version || '',
      vendor: data.vendor || '',
      confidentiality: data.confidentiality ?? 3,
      integrity: data.integrity ?? 3,
      availability: data.availability ?? 3,
      notes: data.notes || '',
    })
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()

    const { error: err } = await supabase
      .from('assets')
      .update({
        name: form.name,
        description: form.description,
        type: form.type,
        owner: form.owner,
        location: form.location,
        ip_address: form.ip_address,
        version: form.version,
        vendor: form.vendor,
        confidentiality: form.confidentiality,
        integrity: form.integrity,
        availability: form.availability,
        notes: form.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.push(`/assets/${id}`)
    }, 1000)
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()

    const { error: err } = await supabase
      .from('assets')
      .update({ is_active: false, updated_at: new Date().toISOString() } as any)
      .eq('id', id)

    if (err) {
      setError('Failed to delete asset: ' + err.message)
      setDeleting(false)
      return
    }

    router.push('/assets')
  }

  // Criticality calculations
  const scoreNum = (form.confidentiality * 0.4 + form.integrity * 0.35 + form.availability * 0.25)
  const score = scoreNum.toFixed(2)
  const criticality = scoreNum >= 4 ? 'Critical' : scoreNum >= 3 ? 'High' : scoreNum >= 2 ? 'Medium' : 'Low'
  const critColor = {
    Critical: 'text-red-400',
    High: 'text-orange-400',
    Medium: 'text-yellow-400',
    Low: 'text-green-400',
  }[criticality]

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="glass rounded-xl p-16 text-center border border-white/5 bg-white/5">
          <RefreshCw className="w-8 h-8 text-slate-700 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm animate-pulse">Loading asset data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex flex-col gap-2">
        <PageHeader
          title="Edit Asset"
          subtitle="Update asset information and risk assessment"
        />
        <Link
          href={`/assets/${id}`}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm transition-colors mb-4 md:mb-0"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Asset
        </Link>
      </div>

      {error && (
        <div className="mb-6 flex items-start md:items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 md:mt-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <Save className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-green-400 text-sm">Asset updated successfully!</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="rounded-2xl p-6 w-full max-w-sm border border-slate-700 space-y-4 shadow-2xl" style={{ background: '#0d1424' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-semibold text-slate-200">Delete Asset?</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Asset <span className="text-slate-200 font-medium">"{form.name}"</span> will be removed from inventory.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all"
              >
                {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 mt-6">
        {/* Basic Info */}
        <div className="glass rounded-xl p-5 md:p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-5">Asset Information</h3>
          <div className="space-y-4">
            <div>
              <label className="label-dark block mb-1.5">Asset Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                className="input-dark w-full"
                placeholder="e.g., Main Database Server"
              />
            </div>
            <div>
              <label className="label-dark block mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="input-dark w-full h-20 resize-none"
                placeholder="Brief description of the asset..."
              />
            </div>
          </div>
        </div>

        {/* Asset Type */}
        <div className="glass rounded-xl p-5 md:p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Asset Type *</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {assetTypes.map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm({ ...form, type: value })}
                className={`p-3 rounded-xl text-left border transition-all ${
                  form.type === value
                    ? 'bg-brand-500/15 border-brand-500/40 ring-1 ring-brand-500/40'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <p className="text-sm mb-0.5">{label}</p>
                <p className="text-[11px] text-slate-600 leading-tight">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="glass rounded-xl p-5 md:p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-5">Asset Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-dark block mb-1.5">Owner / Custodian</label>
              <input
                type="text"
                value={form.owner}
                onChange={e => setForm({ ...form, owner: e.target.value })}
                className="input-dark w-full"
              />
            </div>
            <div>
              <label className="label-dark block mb-1.5">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                className="input-dark w-full"
              />
            </div>
            <div>
              <label className="label-dark block mb-1.5">Vendor</label>
              <input
                type="text"
                value={form.vendor}
                onChange={e => setForm({ ...form, vendor: e.target.value })}
                className="input-dark w-full"
              />
            </div>
            <div>
              <label className="label-dark block mb-1.5">Version</label>
              <input
                type="text"
                value={form.version}
                onChange={e => setForm({ ...form, version: e.target.value })}
                className="input-dark w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label-dark block mb-1.5">IP Address</label>
              <input
                type="text"
                value={form.ip_address}
                onChange={e => setForm({ ...form, ip_address: e.target.value })}
                className="input-dark w-full"
                placeholder="0.0.0.0"
              />
            </div>
          </div>
        </div>

        {/* CIA Triad Rating */}
        <div className="glass rounded-xl p-5 md:p-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-300">CIA Triad Rating</h3>
              <p className="text-xs text-slate-600">Impact of attribute loss on the organization.</p>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 text-right min-w-[140px]">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">Criticality</p>
              <p className={`text-lg font-bold leading-tight ${critColor}`}>{score} — {criticality}</p>
            </div>
          </div>
          
          <div className="space-y-8">
            <CIASlider
              label="Confidentiality (C)"
              name="confidentiality"
              value={form.confidentiality}
              onChange={v => setForm({ ...form, confidentiality: v })}
              description="Impact of unauthorized disclosure?"
            />
            <CIASlider
              label="Integrity (I)"
              name="integrity"
              value={form.integrity}
              onChange={v => setForm({ ...form, integrity: v })}
              description="Impact of unauthorized modification?"
            />
            <CIASlider
              label="Availability (A)"
              name="availability"
              value={form.availability}
              onChange={v => setForm({ ...form, availability: v })}
              description="Impact of asset being unavailable?"
            />
          </div>
          
          <div className="mt-8 p-3.5 rounded-lg bg-slate-950/50 border border-slate-800/50">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Calculation Logic</p>
            <p className="text-[11px] text-slate-600 font-mono break-all sm:break-normal">
              (C:{form.confidentiality}×0.4) + (I:{form.integrity}×0.35) + (A:{form.availability}×0.25) = <span className={critColor}>{score}</span>
            </p>
          </div>
        </div>

        {/* Notes */}
        <div className="glass rounded-xl p-5 md:p-6">
          <label className="label-dark block mb-1.5">Additional Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            className="input-dark w-full h-24 resize-none"
            placeholder="Dependencies or additional context..."
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pb-10">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Delete Asset
          </button>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link
              href={`/assets/${id}`}
              className="text-center px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || success}
              className="flex items-center justify-center gap-2 px-8 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold transition-all disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}