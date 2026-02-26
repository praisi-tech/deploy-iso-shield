'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/ui/PageHeader'
import {
  Users, Building2, Shield, UserCheck, Mail, Calendar,
  Edit2, Check, X, Search, RefreshCw, AlertCircle, Crown,
  ChevronDown, Link, Copy
} from 'lucide-react'

type UserRole = 'admin' | 'auditor' | 'auditee'

interface Organization {
  id: string
  name: string
  created_at: string | null
}

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  organization_id: string | null
  created_at: string | null
}

interface ProfileWithOrg extends Profile {
  organization?: Organization | null
}

const roleBadge: Record<UserRole, { label: string; color: string }> = {
  admin:   { label: 'Admin',   color: 'bg-brand-100 text-brand-700 border-brand-300' },
  auditor: { label: 'Auditor', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  auditee: { label: 'Auditee', color: 'bg-slate-200 text-slate-700 border-slate-400' },
}

const roleOptions: UserRole[] = ['admin', 'auditor', 'auditee']

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getInitials(name: string | null, email: string) {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return email[0].toUpperCase()
}

export default function AdminSettingsPage() {
  const supabase = createClient()

  const [currentUser, setCurrentUser]       = useState<Profile | null>(null)
  const [users, setUsers]                   = useState<ProfileWithOrg[]>([])
  const [organizations, setOrganizations]   = useState<Organization[]>([])
  const [loading, setLoading]               = useState(true)
  const [searchQuery, setSearchQuery]       = useState('')
  const [filterOrg, setFilterOrg]           = useState<string>('all')
  const [filterRole, setFilterRole]         = useState<string>('all')
  const [feedback, setFeedback]             = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [editingUser, setEditingUser]       = useState<string | null>(null)
  const [editRole, setEditRole]             = useState<UserRole>('auditee')
  const [editOrgId, setEditOrgId]           = useState<string>('')
  const [saving, setSaving]                 = useState(false)

  const [showLinkModal, setShowLinkModal]   = useState(false)
  const [linkOrgId, setLinkOrgId]           = useState<string>('')
  const [linkRole, setLinkRole]             = useState<UserRole>('auditee')
  const [copied, setCopied]                 = useState(false)

  function buildInviteLink(orgId: string, role: UserRole): string {
    const base = typeof window !== 'undefined' ? `${window.location.origin}/auth/register` : '/auth/register'
    return `${base}?${new URLSearchParams({ org: orgId, role }).toString()}`
  }

  function handleCopyLink() {
    if (!linkOrgId) return
    navigator.clipboard.writeText(buildInviteLink(linkOrgId, linkRole)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    setCurrentUser(profile as Profile | null)

    const [{ data: allUsers }, { data: allOrgs }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('organizations').select('*').order('name', { ascending: true }),
    ])

    const orgs = (allOrgs || []) as Organization[]
    setOrganizations(orgs)

    const usersWithOrg = ((allUsers || []) as Profile[]).map(u => ({
      ...u,
      organization: orgs.find(o => o.id === u.organization_id) ?? null,
    }))
    setUsers(usersWithOrg)
    setLoading(false)
  }

  function startEdit(user: ProfileWithOrg) {
    setEditingUser(user.id)
    setEditRole(user.role)
    setEditOrgId(user.organization_id ?? '')
  }

  function cancelEdit() {
    setEditingUser(null)
  }

  async function saveEdit(userId: string) {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ role: editRole, organization_id: editOrgId || null })
      .eq('id', userId)

    if (error) {
      showFeedback('error', 'Failed to update: ' + error.message)
    } else {
      const org = organizations.find(o => o.id === editOrgId) ?? null
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, role: editRole, organization_id: editOrgId || null, organization: org }
          : u
      ))
      showFeedback('success', 'User updated successfully.')
      setEditingUser(null)
    }
    setSaving(false)
  }

  function showFeedback(type: 'success' | 'error', message: string) {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 3500)
  }

  const filtered = users.filter(u => {
    const q = searchQuery.toLowerCase()
    const matchSearch =
      !q ||
      u.email.toLowerCase().includes(q) ||
      (u.full_name ?? '').toLowerCase().includes(q) ||
      (u.organization?.name ?? '').toLowerCase().includes(q)
    const matchOrg =
      filterOrg === 'all' ||
      (filterOrg === 'none' ? !u.organization_id : u.organization_id === filterOrg)
    const matchRole = filterRole === 'all' || u.role === filterRole
    return matchSearch && matchOrg && matchRole
  })

  const stats = {
    total:   users.length,
    orgs:    organizations.length,
    admins:  users.filter(u => u.role === 'admin').length,
    noOrg:   users.filter(u => !u.organization_id).length,
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="glass rounded-xl p-16 text-center">
          <p className="text-slate-500 text-sm animate-pulse">Loading admin data...</p>
        </div>
      </div>
    )
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="glass rounded-xl p-16 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Access Denied</p>
          <p className="text-slate-400 text-sm mt-1">Only admins can view this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Admin Settings"
        subtitle="Manage all users, organizations, and roles across the platform"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowLinkModal(true)
                setLinkOrgId(organizations[0]?.id ?? '')
                setLinkRole('auditee')
                setCopied(false)
              }}
              className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all"
            >
              <Link className="w-4 h-4" />
              <span className="hidden sm:inline">Invite Link</span>
            </button>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-all border border-slate-200"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {/* Feedback toast */}
      {feedback && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 border ${
          feedback.type === 'success'
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {feedback.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <X className="w-4 h-4 flex-shrink-0" />}
          {feedback.message}
        </div>
      )}

      {/* Stats — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Users',     value: stats.total,  icon: Users,       color: 'text-slate-700' },
          { label: 'Organizations',   value: stats.orgs,   icon: Building2,   color: 'text-blue-600'  },
          { label: 'Admins',          value: stats.admins, icon: Crown,       color: 'text-brand-600' },
          { label: 'No Org Assigned', value: stats.noOrg,  icon: AlertCircle, color: 'text-amber-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-xl p-4 text-center">
            <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
            <p className={`text-2xl font-bold ${color} tabular-nums`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Invite Link Modal ── */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="glass rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-slate-800">Generate Invite Link</h3>
              <button onClick={() => setShowLinkModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              Share this link with someone who hasn&apos;t registered yet. They&apos;ll be automatically assigned to the selected organization and role on sign-up.
            </p>

            <div className="mb-4">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
                Organization
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={linkOrgId}
                  onChange={e => { setLinkOrgId(e.target.value); setCopied(false) }}
                  className="appearance-none w-full pl-9 pr-8 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-brand-400 cursor-pointer"
                >
                  <option value="">— Select an organization —</option>
                  {organizations.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
                Assign Role
              </label>
              <div className="flex gap-2">
                {roleOptions.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => { setLinkRole(r); setCopied(false) }}
                    className={`flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                      linkRole === r
                        ? r === 'admin'
                          ? 'bg-brand-100 border-brand-400 text-brand-700'
                          : r === 'auditor'
                          ? 'bg-purple-100 border-purple-400 text-purple-700'
                          : 'bg-slate-200 border-slate-400 text-slate-700'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {roleBadge[r].label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`rounded-xl border p-3 mb-4 transition-all ${linkOrgId ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-dashed border-slate-200'}`}>
              <p className="text-xs text-slate-400 mb-1.5 font-medium">Invite URL</p>
              {linkOrgId ? (
                <p className="text-xs font-mono text-slate-700 break-all leading-relaxed select-all">
                  {buildInviteLink(linkOrgId, linkRole)}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">Select an organization to generate the link.</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleCopyLink}
                disabled={!linkOrgId}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  copied
                    ? 'bg-green-100 border border-green-300 text-green-700'
                    : 'bg-brand-600 hover:bg-brand-500 text-white'
                }`}
              >
                {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters — stacked on mobile */}
      <div className="glass rounded-xl p-4 mb-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        {/* Search — full width on mobile */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or org..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-brand-400"
          />
        </div>

        {/* Org + Role filters side by side on mobile */}
        <div className="flex gap-3">
          <div className="relative flex-1 sm:flex-none">
            <select
              value={filterOrg}
              onChange={e => setFilterOrg(e.target.value)}
              className="appearance-none w-full pl-3 pr-8 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-sm focus:outline-none focus:border-brand-400 cursor-pointer"
            >
              <option value="all">All Orgs</option>
              <option value="none">No Org</option>
              {organizations.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative flex-1 sm:flex-none">
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="appearance-none w-full pl-3 pr-8 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-sm focus:outline-none focus:border-brand-400 cursor-pointer"
            >
              <option value="all">All Roles</option>
              {roleOptions.map(r => (
                <option key={r} value={r}>{roleBadge[r].label}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <span className="text-xs text-slate-400 sm:ml-auto text-right">
          {filtered.length} of {users.length} users
        </span>
      </div>

      {/* ── MOBILE: Card layout (hidden on md+) ── */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No users match your filters.</p>
          </div>
        ) : filtered.map(user => {
          const isEditing = editingUser === user.id
          const isMe = user.id === currentUser?.id
          return (
            <div key={user.id} className={`glass rounded-xl p-4 transition-colors ${isEditing ? 'ring-2 ring-brand-400/40 bg-brand-50/20' : ''}`}>
              {/* Card header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-sm font-semibold text-brand-700 flex-shrink-0">
                    {getInitials(user.full_name, user.email)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">
                      {user.full_name || '(No Name)'}
                      {isMe && <span className="ml-1 text-xs text-brand-400 font-normal">(You)</span>}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>

                {/* Edit / Save / Cancel buttons */}
                {isEditing ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => saveEdit(user.id)}
                      disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-all disabled:opacity-50"
                    >
                      {saving
                        ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                        : <Check className="w-3 h-3" />}
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : !isMe ? (
                  <button
                    onClick={() => startEdit(user)}
                    className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all flex-shrink-0"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                ) : null}
              </div>

              {/* Card body */}
              <div className="space-y-2.5">
                {/* Organization */}
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Organization</p>
                  {isEditing ? (
                    <div className="relative">
                      <select
                        value={editOrgId}
                        onChange={e => setEditOrgId(e.target.value)}
                        className="appearance-none w-full pl-3 pr-7 py-2 rounded-lg bg-white border border-brand-400 text-slate-800 text-sm focus:outline-none"
                      >
                        <option value="">— No Organization —</option>
                        {organizations.map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  ) : user.organization ? (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span className="text-slate-700 text-sm font-medium">{user.organization.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-500 italic">No organization</span>
                  )}
                </div>

                {/* Role */}
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Role</p>
                  {isEditing ? (
                    <div className="flex gap-1.5">
                      {roleOptions.map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setEditRole(r)}
                          className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                            editRole === r
                              ? r === 'admin'
                                ? 'bg-brand-100 border-brand-400 text-brand-700'
                                : r === 'auditor'
                                ? 'bg-purple-100 border-purple-400 text-purple-700'
                                : 'bg-slate-200 border-slate-400 text-slate-700'
                              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {roleBadge[r].label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleBadge[user.role]?.color ?? roleBadge.auditee.color}`}>
                      {roleBadge[user.role]?.label ?? user.role}
                    </span>
                  )}
                </div>

                {/* Joined date */}
                <div className="flex items-center gap-1.5 text-slate-400 text-xs pt-0.5">
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  Joined {formatDate(user.created_at)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── DESKTOP: Table layout (hidden on mobile) ── */}
      <div className="hidden md:block glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Organization</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Joined</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No users match your filters.</p>
                </td>
              </tr>
            ) : filtered.map((user) => (
              <tr
                key={user.id}
                className={`hover:bg-slate-50 transition-colors ${editingUser === user.id ? 'bg-brand-50/40' : ''}`}
              >
                {/* User */}
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-xs font-semibold text-brand-700 flex-shrink-0">
                      {getInitials(user.full_name, user.email)}
                    </div>
                    <span className="font-medium text-slate-800 text-sm">
                      {user.full_name || '(No Name)'}
                      {user.id === currentUser?.id && (
                        <span className="ml-1.5 text-xs text-brand-400 font-normal">(You)</span>
                      )}
                    </span>
                  </div>
                </td>

                {/* Email */}
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    {user.email}
                  </div>
                </td>

                {/* Organization */}
                <td className="px-6 py-3.5">
                  {editingUser === user.id ? (
                    <div className="relative">
                      <select
                        value={editOrgId}
                        onChange={e => setEditOrgId(e.target.value)}
                        className="appearance-none w-full pl-2 pr-7 py-1 rounded-lg bg-white border border-brand-400 text-slate-800 text-xs focus:outline-none"
                      >
                        <option value="">— No Organization —</option>
                        {organizations.map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  ) : user.organization ? (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span className="text-slate-700 text-xs font-medium">{user.organization.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-500 italic">No organization</span>
                  )}
                </td>

                {/* Role */}
                <td className="px-6 py-3.5">
                  {editingUser === user.id ? (
                    <div className="flex gap-1">
                      {roleOptions.map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setEditRole(r)}
                          className={`px-2 py-1 rounded-md border text-xs font-medium transition-all ${
                            editRole === r
                              ? r === 'admin'
                                ? 'bg-brand-100 border-brand-400 text-brand-700'
                                : r === 'auditor'
                                ? 'bg-purple-100 border-purple-400 text-purple-700'
                                : 'bg-slate-200 border-slate-400 text-slate-700'
                              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {roleBadge[r].label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleBadge[user.role]?.color ?? roleBadge.auditee.color}`}>
                      {roleBadge[user.role]?.label ?? user.role}
                    </span>
                  )}
                </td>

                {/* Joined */}
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    {formatDate(user.created_at)}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-3.5 text-right">
                  {editingUser === user.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => saveEdit(user.id)}
                        disabled={saving}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-all disabled:opacity-50"
                      >
                        {saving
                          ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                          : <Check className="w-3 h-3" />}
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition-all"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                    </div>
                  ) : user.id !== currentUser?.id ? (
                    <button
                      onClick={() => startEdit(user)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                      title="Edit user"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-xs text-slate-300 pr-1">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}