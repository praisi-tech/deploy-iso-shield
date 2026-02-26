'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  User, Mail, Building2, Shield, Lock, Trash2, Save,
  CheckCircle2, XCircle, Clock, FolderOpen,
  ClipboardList, AlertTriangle, Eye, EyeOff, Camera,
  SendHorizonal, X, Upload, RefreshCw
} from 'lucide-react'

type UserRole = 'admin' | 'auditor' | 'auditee'

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  organization_id: string | null
  created_at: string
  updated_at: string
}

interface Organization {
  id: string
  name: string
  sector: string
  employee_count: number | null
  created_at: string
}

interface ActivityItem {
  id: string
  type: 'asset' | 'evidence' | 'finding' | 'checklist'
  label: string
  name: string
  date: string
}

const roleBadge: Record<UserRole, { label: string; color: string }> = {
  admin:   { label: 'Admin',   color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  auditor: { label: 'Auditor', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  auditee: { label: 'Auditee', color: 'bg-slate-100 text-slate-600 border-slate-200' },
}

const activityIcon: Record<ActivityItem['type'], React.ElementType> = {
  asset:     Shield,
  evidence:  FolderOpen,
  finding:   AlertTriangle,
  checklist: ClipboardList,
}

const activityColor: Record<ActivityItem['type'], string> = {
  asset:     'text-indigo-500 bg-indigo-50',
  evidence:  'text-blue-500 bg-blue-50',
  finding:   'text-orange-500 bg-orange-50',
  checklist: 'text-purple-500 bg-purple-50',
}

function formatDate(date: string) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

function formatRelative(date: string) {
  if (!date) return 'Unknown'
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return formatDate(date)
}

function getInitials(name: string | null, email: string) {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return email[0].toUpperCase()
}

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [org, setOrg] = useState<Organization | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  const [fullName, setFullName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDelete, setShowDelete] = useState(false)

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const profileData = p as Profile
    setProfile(profileData)
    setFullName(profileData?.full_name || '')

    if (profileData?.organization_id) {
      const { data: o } = await supabase.from('organizations').select('*').eq('id', profileData.organization_id).single()
      setOrg(o as Organization)
    }

    const activities: ActivityItem[] = []
    
    const { data: assets } = await supabase.from('assets').select('id, name, created_at').eq('created_by', user.id).order('created_at', { ascending: false }).limit(3)
    assets?.forEach(a => activities.push({ id: a.id, type: 'asset', label: 'Added Asset', name: a.name, date: (a as any).created_at ?? '' }))

    const { data: evidences } = await supabase.from('evidence_files').select('id, file_name, uploaded_at').eq('uploaded_by', user.id).order('uploaded_at', { ascending: false }).limit(3)
    evidences?.forEach(e => activities.push({ id: e.id, type: 'evidence', label: 'Uploaded Evidence', name: (e as any).file_name, date: (e as any).uploaded_at ?? '' }))

    const { data: findings } = await supabase.from('audit_findings').select('id, title, created_at').eq('created_by', user.id).order('created_at', { ascending: false }).limit(3)
    findings?.forEach(f => activities.push({ id: f.id, type: 'finding', label: 'Created Finding', name: (f as any).title, date: (f as any).created_at ?? '' }))

    const { data: assessments } = await supabase.from('control_assessments').select('id, notes, assessed_at').eq('assessed_by', user.id).order('assessed_at', { ascending: false }).limit(3)
    ;(assessments as any[])?.forEach(c => activities.push({ 
      id: c.id, 
      type: 'checklist', 
      label: 'ISO Control Assessment', 
      name: c.notes ? c.notes.slice(0, 40) + '...' : 'ISO Control Assessment', 
      date: c.assessed_at ?? '' 
    }))

    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setActivity(activities.slice(0, 8))
    setLoading(false)
  }

  function showFeedback(type: 'success' | 'error', message: string) {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { showFeedback('error', 'File size limit is 2MB.'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleUploadAvatar() {
    if (!avatarFile || !profile) return
    setUploadingAvatar(true)
    const ext = avatarFile.name.split('.').pop()
    const path = `avatars/${profile.id}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
    if (uploadError) { showFeedback('error', 'Upload failed: ' + uploadError.message); setUploadingAvatar(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id)
    if (updateError) { showFeedback('error', 'Failed to save avatar URL.') }
    else { setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev); showFeedback('success', 'Avatar updated successfully!'); setShowAvatarModal(false); setAvatarFile(null); setAvatarPreview(null) }
    setUploadingAvatar(false)
  }

  async function handleRemoveAvatar() {
    if (!profile) return
    setUploadingAvatar(true)
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id)
    setProfile(prev => prev ? { ...prev, avatar_url: null } : prev)
    setAvatarPreview(null); setAvatarFile(null); setShowAvatarModal(false)
    showFeedback('success', 'Avatar removed.')
    setUploadingAvatar(false)
  }

  async function handleSaveProfile() {
    if (!profile) return
    setSavingProfile(true)
    const { error } = await supabase.from('profiles').update({ full_name: fullName, updated_at: new Date().toISOString() }).eq('id', profile.id)
    if (error) showFeedback('error', 'Failed to save: ' + error.message)
    else { setProfile(prev => prev ? { ...prev, full_name: fullName } : prev); showFeedback('success', 'Profile updated successfully!') }
    setSavingProfile(false)
  }

  async function handleChangePassword() {
    if (!oldPassword) { showFeedback('error', 'Please enter your current password.'); return }
    if (newPassword.length < 6) { showFeedback('error', 'New password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { showFeedback('error', 'Passwords do not match.'); return }
    setSavingPassword(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: profile!.email, password: oldPassword })
    if (signInError) { showFeedback('error', 'Current password is incorrect.'); setSavingPassword(false); return }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) showFeedback('error', 'Failed to change password: ' + error.message)
    else { showFeedback('success', 'Password changed successfully!'); setOldPassword(''); setNewPassword(''); setConfirmPassword('') }
    setSavingPassword(false)
  }

  async function handleSendReset() {
    if (!profile) return
    setSendingReset(true)
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, { redirectTo: `${window.location.origin}/auth/reset-password` })
    if (error) showFeedback('error', 'Failed to send email: ' + error.message)
    else { setResetSent(true); showFeedback('success', `Reset link sent to ${profile.email}`) }
    setSendingReset(false)
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== profile?.email) { showFeedback('error', 'Email does not match.'); return }
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  )

  if (!profile) return null

  const avatarSrc = profile.avatar_url

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-5">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg sm:text-xl font-bold text-slate-800">My Profile</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Manage your account and preferences</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-5">
        {/* Feedback */}
        {feedback && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border text-sm animate-in fade-in slide-in-from-top-2
            ${feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
            {feedback.message}
          </div>
        )}

        {/* Avatar Modal */}
        {showAvatarModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-slate-200 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Edit Avatar</h3>
                <button onClick={() => { setShowAvatarModal(false); setAvatarPreview(null); setAvatarFile(null) }} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex justify-center">
                {(avatarPreview || avatarSrc) ? (
                  <img src={avatarPreview || avatarSrc!} alt="Preview" className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-200 shadow-sm" />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-3xl font-bold text-indigo-500">
                    {getInitials(profile.full_name, profile.email)}
                  </div>
                )}
              </div>
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl p-5 text-center cursor-pointer transition-colors group">
                <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 mx-auto mb-2 transition-colors" />
                <p className="text-sm text-slate-500 truncate px-2">{avatarFile ? avatarFile.name : 'Click to select photo'}</p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, WebP — max 2MB</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
              <div className="flex flex-col gap-2">
                <button onClick={handleUploadAvatar} disabled={!avatarFile || uploadingAvatar}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all disabled:opacity-40">
                  {uploadingAvatar ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {uploadingAvatar ? 'Uploading...' : 'Save Avatar'}
                </button>
                {avatarSrc && (
                  <button onClick={handleRemoveAvatar} disabled={uploadingAvatar} className="w-full py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors text-sm font-medium">
                    Remove Current Photo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 shadow-sm">
          <button onClick={() => setShowAvatarModal(true)} className="relative group flex-shrink-0">
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-100 group-hover:border-indigo-300 transition-colors" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-indigo-50 border-2 border-indigo-100 group-hover:border-indigo-300 flex items-center justify-center text-2xl font-bold text-indigo-500 transition-colors">
                {getInitials(profile.full_name, profile.email)}
              </div>
            )}
            <div className="absolute inset-0 rounded-2xl bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </button>
          <div className="flex-1 min-w-0 text-center sm:text-left w-full">
            <h2 className="text-xl font-bold text-slate-800 truncate">{profile.full_name || '(No name set)'}</h2>
            <p className="text-slate-500 text-sm mt-0.5 truncate">{profile.email}</p>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-3">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border ${roleBadge[profile.role].color}`}>
                {roleBadge[profile.role].label}
              </span>
              {org && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {org.name}
                </span>
              )}
            </div>
          </div>
          <div className="text-center sm:text-right text-[10px] uppercase tracking-tighter text-slate-400 flex-shrink-0 pt-2 sm:pt-0">
            <p>Member Since</p>
            <p className="text-slate-600 font-bold mt-0.5">{formatDate(profile.created_at)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Edit Profile */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <User className="w-4 h-4 text-indigo-500" />
              </div>
              <h3 className="font-semibold text-slate-700">Account Details</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block font-medium">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block font-medium">Email Address</label>
                <div className="relative">
                  <input type="email" value={profile.email} disabled
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-sm cursor-not-allowed" />
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 ml-1">Email cannot be changed manually.</p>
              </div>
              <button onClick={handleSaveProfile} disabled={savingProfile || fullName === profile.full_name}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all disabled:opacity-50">
                <Save className="w-4 h-4" />
                {savingProfile ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </section>

          {/* Change Password */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <Lock className="w-4 h-4 text-purple-500" />
              </div>
              <h3 className="font-semibold text-slate-700">Security</h3>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <label className="text-xs text-slate-500 mb-1.5 block font-medium">Current Password</label>
                <div className="relative">
                  <input type={showOld ? 'text' : 'password'} value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="••••••••"
                    className="w-full px-4 py-2.5 pr-12 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-400 transition-all" />
                  <button type="button" onClick={() => setShowOld(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="relative">
                <label className="text-xs text-slate-500 mb-1.5 block font-medium">New Password</label>
                <div className="relative">
                  <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 chars"
                    className="w-full px-4 py-2.5 pr-12 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-400 transition-all" />
                  <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block font-medium">Confirm New Password</label>
                <input type={showNew ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-400 transition-all" />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[10px] text-red-500 mt-1.5 font-medium">Passwords do not match.</p>
                )}
              </div>
              <button onClick={handleChangePassword} disabled={savingPassword || !oldPassword || !newPassword || newPassword !== confirmPassword}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-all disabled:opacity-50">
                {savingPassword ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {savingPassword ? 'Verifying...' : 'Change Password'}
              </button>
              <div className="pt-3 border-t border-slate-100">
                {resetSent ? (
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    Reset link sent to your inbox.
                  </div>
                ) : (
                  <button onClick={handleSendReset} disabled={sendingReset}
                    className="flex items-center gap-2 text-[11px] text-purple-600 hover:text-purple-700 hover:underline transition-all disabled:opacity-50 w-full justify-center">
                    {sendingReset ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <SendHorizonal className="w-3.5 h-3.5" />}
                    Forgot current password? Send reset email
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Organization Info */}
        {org && (
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-500" />
              </div>
              <h3 className="font-semibold text-slate-700">Organization Settings</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Company Name</p>
                <p className="text-slate-800 font-medium truncate">{org.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Business Sector</p>
                <p className="text-slate-800 font-medium capitalize truncate">{org.sector}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Staff Capacity</p>
                <p className="text-slate-800 font-medium">{org.employee_count ?? 'Not specified'}</p>
              </div>
            </div>
          </section>
        )}

        {/* Recent Activity */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="font-semibold text-slate-700">Recent Activity</h3>
          </div>
          {activity.length > 0 ? (
            <div className="space-y-1">
              {activity.map((item) => {
                const Icon = activityIcon[item.type]
                return (
                  <div key={item.id + item.date} className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${activityColor[item.type]}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{item.label}</p>
                      <p className="text-sm text-slate-700 truncate font-medium">{item.name}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 font-medium">{formatRelative(item.date)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-10">
              <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Your activity timeline is currently empty.</p>
            </div>
          )}
        </section>

        {/* Danger Zone */}
        <section className="bg-white rounded-2xl border border-red-100 p-5 sm:p-6 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="font-semibold text-red-600">Danger Zone</h3>
              </div>
              <p className="text-xs text-slate-500">Permanently remove your account and all associated data.</p>
            </div>
            <button onClick={() => setShowDelete(p => !p)}
              className={`w-full sm:w-auto px-4 py-2 rounded-xl border text-xs font-semibold transition-all
                ${showDelete ? 'bg-slate-100 border-slate-300 text-slate-600' : 'border-red-200 text-red-500 hover:bg-red-50'}`}>
              {showDelete ? 'Cancel Request' : 'Delete My Account'}
            </button>
          </div>
          
          {showDelete && (
            <div className="mt-5 pt-5 border-t border-red-100 space-y-4 animate-in slide-in-from-top-4">
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-sm text-red-800 leading-relaxed">
                  Warning: This action is irreversible. Please type your email 
                  <span className="font-bold px-1.5 py-0.5 bg-red-100 rounded mx-1 text-red-900 select-all">{profile.email}</span> 
                  below to confirm.
                </p>
              </div>
              <div className="space-y-3">
                <input type="email" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={profile.email}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-red-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-400 transition-all" />
                <button onClick={handleDeleteAccount} disabled={deleteConfirm !== profile.email}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-lg shadow-red-500/20 transition-all disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed">
                  <Trash2 className="w-4 h-4" />
                  Finalize Account Deletion
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
      
      {/* Footer spacer for mobile */}
      <div className="h-10 md:hidden" />
    </div>
  )
}