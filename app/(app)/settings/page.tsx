'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/ui/PageHeader'
import { Users, Shield, UserCheck, Mail, Calendar, Edit2, Trash2, UserPlus, X, Check } from 'lucide-react'

type UserRole = 'admin' | 'auditor' | 'auditee'

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  organization_id: string | null
  created_at: string | null
}

const roleBadge: Record<UserRole, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-brand-100 text-brand-700 border-brand-300' },
  auditor: { label: 'Auditor', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  auditee: { label: 'Auditee', color: 'bg-slate-200 text-slate-700 border-slate-400' },
}

const roleOptions: UserRole[] = ['admin', 'auditor', 'auditee']

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getInitials(name: string | null, email: string) {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return email[0].toUpperCase()
}

export default function UserManagementPage() {
  const supabase = createClient()
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<UserRole>('auditee')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('auditee')
  const [showInvite, setShowInvite] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setCurrentUser(profile as Profile | null)

    if (profile?.organization_id) {
      const { data: teamMembers } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: true })

      setMembers(teamMembers || [])
    }

    setLoading(false)
  }

  async function updateRole(userId: string, newRole: UserRole) {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      showFeedback('error', 'Failed to update role: ' + error.message)
    } else {
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, role: newRole } : m))
      showFeedback('success', 'Role updated successfully!')
    }
    setEditingId(null)
    setSaving(false)
  }

  async function removeMember(userId: string) {
    if (!confirm('Are you sure you want to remove this user from the organization?')) return
    const { error } = await supabase
      .from('profiles')
      .update({ organization_id: null })
      .eq('id', userId)

    if (error) {
      showFeedback('error', 'Failed to remove member: ' + error.message)
    } else {
      setMembers(prev => prev.filter(m => m.id !== userId))
      showFeedback('success', 'Member has been removed from the organization.')
    }
  }

  function showFeedback(type: 'success' | 'error', message: string) {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 3500)
  }

  const isAdmin = currentUser?.role === 'admin'

  const stats = {
    total: members.length,
    admin: members.filter(m => m.role === 'admin').length,
    auditor: members.filter(m => m.role === 'auditor').length,
    auditee: members.filter(m => m.role === 'auditee').length,
  }

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="glass rounded-xl p-16 text-center">
          <p className="text-slate-500 text-sm animate-pulse">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title="User Management"
        subtitle={`${stats.total} members in the organization`}
        actions={
          isAdmin ? (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white/80 text-sm font-medium transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </button>
          ) : null
        }
      />

      {/* Feedback toast */}
      {feedback && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 border
          ${feedback.type === 'success'
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-700 border-red-200'
          }`}>
          {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {feedback.message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'text-slate-700' },
          { label: 'Admin', value: stats.admin, icon: Shield, color: 'text-brand-600' },
          { label: 'Auditor', value: stats.auditor, icon: UserCheck, color: 'text-purple-600' },
          { label: 'Auditee', value: stats.auditee, icon: Users, color: 'text-slate-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-xl p-4 text-center">
            <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
            <p className={`text-2xl font-bold ${color} tabular-nums`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Invite New Member</h3>
              <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Copy the invite link and send it manually to the user you want to join, or use the email invite feature if configured in Supabase.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Email</label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-brand-500"
                >
                  {roleOptions.map(r => (
                    <option key={r} value={r}>{roleBadge[r].label}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 bg-slate-50 rounded-lg p-3 border border-slate-200">
              💡 Users must sign up themselves on the signup page, then an admin can update their role after they join the same organization.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowInvite(false)}
                className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members table */}
      {members.length > 0 ? (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Joined</th>
                {isAdmin && (
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-sm font-semibold text-brand-700 flex-shrink-0">
                        {getInitials(member.full_name, member.email)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                          {member.full_name || '(No Name)'}
                          {member.id === currentUser?.id && (
                            <span className="ml-2 text-xs text-brand-500 font-normal">(You)</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {member.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingId === member.id ? (
                      <select
                        value={editingRole}
                        onChange={e => setEditingRole(e.target.value as UserRole)}
                        className="px-2 py-1 rounded bg-white border border-brand-400 text-slate-800 text-xs focus:outline-none"
                        autoFocus
                      >
                        {roleOptions.map(r => (
                          <option key={r} value={r}>{roleBadge[r].label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${roleBadge[member.role].color}`}>
                        {roleBadge[member.role].label}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                      {member.created_at ? formatDate(member.created_at) : '—'}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      {editingId === member.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => updateRole(member.id, editingRole)}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-all disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {member.id !== currentUser?.id && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingId(member.id)
                                  setEditingRole(member.role)
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                                title="Change Role"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => removeMember(member.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                title="Remove from Organization"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass rounded-xl p-16 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-500 mb-2">No Members Yet</h3>
          <p className="text-slate-400 text-sm">There are no other users in this organization.</p>
        </div>
      )}

      {/* Role legend */}
      <div className="mt-6 glass rounded-xl p-4">
        <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider">Role Descriptions</p>
        <div className="grid grid-cols-3 gap-4 text-xs text-slate-500">
          <div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mb-1 ${roleBadge.admin.color}`}>Admin</span>
            <p>Full access: manage users, edit all data, view all features.</p>
          </div>
          <div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mb-1 ${roleBadge.auditor.color}`}>Auditor</span>
            <p>Can create findings, audit reports, and ISO checklists.</p>
          </div>
          <div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mb-1 ${roleBadge.auditee.color}`}>Auditee</span>
            <p>Read-only access. Can upload evidence and view dashboard.</p>
          </div>
        </div>
      </div>
    </div>
  )
}