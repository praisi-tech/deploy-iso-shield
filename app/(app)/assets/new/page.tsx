'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Save, 
  AlertCircle, 
  RefreshCw,
  Monitor,
  HardDrive,
  Database,
  Zap,
  Users,
  Building2,
  Box 
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CIASlider from '@/components/ui/CIASlider'
import PageHeader from '@/components/ui/PageHeader'

type AssetType = 'hardware' | 'software' | 'data' | 'service' | 'personnel' | 'facility'

const assetTypes: { value: AssetType; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'hardware', label: 'Hardware', icon: Monitor, desc: 'Physical devices, servers' },
  { value: 'software', label: 'Software', icon: HardDrive, desc: 'Applications, OS' },
  { value: 'data', label: 'Data', icon: Database, desc: 'Databases, documents' },
  { value: 'service', label: 'Service', icon: Zap, desc: 'Cloud services, APIs' },
  { value: 'personnel', label: 'Personnel', icon: Users, desc: 'People with access' },
  { value: 'facility', label: 'Facility', icon: Building2, desc: 'Offices, Data Centers' },
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

export default function NewAssetPage() {
  const router = useRouter()

  const [orgId, setOrgId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
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
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) {
        router.push('/organization')
        return
      }

      setOrgId(profile.organization_id)
      setUserId(user.id)
    }
    loadProfile()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId || !userId) {
      setError('Organization not found. Please refresh and try again.')
      return
    }

    setSaving(true)
    setError(null)

    const supabase = createClient()

    const { data, error: err } = await supabase
      .from('assets')
      .insert({
        ...form,
        organization_id: orgId,
        created_by: userId,
        is_active: true,
      })
      .select('id')
      .single()

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push(`/assets/${data.id}`), 1000)
  }

  const scoreNum = form.confidentiality * 0.4 + form.integrity * 0.35 + form.availability * 0.25
  const score = scoreNum.toFixed(2)
  const criticality =
    scoreNum >= 4 ? 'Critical' :
    scoreNum >= 3 ? 'High' :
    scoreNum >= 2 ? 'Medium' : 'Low'
  
  const critColor = { 
    Critical: 'text-red-600', 
    High: 'text-orange-600', 
    Medium: 'text-yellow-600', 
    Low: 'text-green-600' 
  }[criticality]

  return (
    <div className="p-8 max-w-3xl mx-auto bg-white min-h-screen">
      <PageHeader
        title="Add New Asset"
        subtitle="Register a new IT asset and assess its risk"
        actions={
          <Link href="/assets" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Inventory
          </Link>
        }
      />

      {error && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-100">
          <Save className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700 text-sm font-medium">Asset created successfully! Redirecting...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 mt-6">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-5 uppercase tracking-wider">Asset Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Asset Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none text-slate-800"
                placeholder="e.g., Main Database Server"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none h-20 resize-none text-slate-800"
                placeholder="Brief asset description..."
              />
            </div>
          </div>
        </div>

        {/* Asset Type - Warna Kontras Sesuai Request */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Asset Type *</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {assetTypes.map(({ value, label, icon: IconComponent, desc }) => {
              const isActive = form.type === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, type: value })}
                  className={`p-4 rounded-2xl text-left border transition-all active:scale-95 text-balance ${
                    isActive
                      ? 'bg-[#EEF2FF] border-[#C7D2FE]' // Latar belakang biru/ungu pucat seperti referensi
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {/* ICON WRAPPER: Jadi Ungu Solid (bg-indigo-600) & Icon Putih (text-white) pas diklik */}
                  <div className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                      : 'bg-slate-50 text-slate-400'
                  }`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  
                  <p className={`text-sm font-bold mb-1 ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {label}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-5 uppercase tracking-wider">Asset Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Owner / Custodian</label>
              <input type="text" value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-indigo-500 transition-all" placeholder="IT Dept / John Doe" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Location</label>
              <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-indigo-500 transition-all" placeholder="Data Center A / Cloud" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Vendor</label>
              <input type="text" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-indigo-500 transition-all" placeholder="Microsoft, AWS..." />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Version</label>
              <input type="text" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-indigo-500 transition-all" placeholder="e.g., v2.3" />
            </div>
          </div>
        </div>

        {/* CIA Triad */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">CIA Triad Rating</h3>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Criticality</p>
              <p className={`text-lg font-black ${critColor}`}>{score} — {criticality}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-8 font-medium">Assess security importance.</p>
          
          <div className="space-y-8">
            <CIASlider label="Confidentiality (C)" name="confidentiality" value={form.confidentiality} onChange={v => setForm({ ...form, confidentiality: v })} description="Sensitivity of data." />
            <CIASlider label="Integrity (I)" name="integrity" value={form.integrity} onChange={v => setForm({ ...form, integrity: v })} description="Accuracy & corruption impact." />
            <CIASlider label="Availability (A)" name="availability" value={form.availability} onChange={v => setForm({ ...form, availability: v })} description="Uptime & outage impact." />
          </div>

          <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-widest">Score Formula</p>
            <p className="text-xs text-slate-600 font-mono font-medium">
              ({form.confidentiality} × 0.4) + ({form.integrity} × 0.35) + ({form.availability} × 0.25) = <span className={`font-bold ${critColor}`}>{score}</span>
            </p>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Additional Notes</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none h-24 resize-none" placeholder="Context..." />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-20">
          <Link href="/assets" className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold transition-all">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || success || !orgId}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Create Asset'}
          </button>
        </div>
      </form>
    </div>
  )
}