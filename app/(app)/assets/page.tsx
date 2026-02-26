import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  Plus, 
  Server, 
  ChevronRight, 
  Monitor, 
  HardDrive, 
  Database, 
  Zap, 
  Users, 
  Building2, 
  Box 
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import RiskBadge from '@/components/ui/RiskBadge'
import { formatAssetType, formatDate } from '@/lib/utils'

// Mapping icon menggunakan Lucide dengan fungsi render untuk memberikan warna solid
// Ikon diberi warna solid biru tua keunguan agar senada dengan referensi
const assetTypeIcons: Record<string, React.ReactNode> = {
  hardware: <Monitor className="w-4 h-4 text-indigo-700" />,
  software: <HardDrive className="w-4 h-4 text-indigo-700" />,
  data: <Database className="w-4 h-4 text-indigo-700" />,
  service: <Zap className="w-4 h-4 text-indigo-700" />,
  personnel: <Users className="w-4 h-4 text-indigo-700" />,
  facility: <Building2 className="w-4 h-4 text-indigo-700" />,
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
    // Menghilangkan glassmorphism dari kontainer utama dan tabel, beralih ke warna latar solid bersih (bg-white)
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 bg-white">
      <PageHeader
        title="Asset Inventory"
        // Teks subtitle solid berwarna abu-abu tua
        subtitle={`${stats.total} assets tracked · ${stats.critical} critical`}
        actions={
          <Link
            href="/assets/new"
            // Perubahan penting di sini: Menambahkan !text-white secara eksplisit 
            // pada parent untuk memaksa semua elemen di dalamnya menjadi putih.
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 !text-white text-sm font-bold transition-all shadow-md active:scale-95 w-full sm:w-auto"
          >
            {/* 1. Ikon + Putih Solid */}
            <Plus 
              className="w-4 h-4 !text-white !stroke-white" 
              strokeWidth={3} // Garis sedikit lebih tebal agar lebih jelas
            />
            
            {/* 2. Teks Putih Solid (Terbungkus Span) */}
            <span className="!text-white">Add New Asset</span>
          </Link>
        }
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-900' },
          { label: 'Critical', value: stats.critical, color: 'text-red-500' }, // Warna solid cerah
          { label: 'High', value: stats.high, color: 'text-orange-500' },
          { label: 'Medium', value: stats.medium, color: 'text-yellow-600' },
          { label: 'Low', value: stats.low, color: 'text-green-600' },
        ].map(({ label, value, color }) => (
          // Menghilangkan glassmorphism, beralih ke warna latar solid bersih (bg-slate-50)
          <div key={label} className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
            <p className={`text-xl md:text-2xl font-black ${color} tabular-nums`}>{value}</p>
            {/* Teks label solid berwarna abu-abu */}
            <p className="text-[10px] md:text-xs text-slate-600 mt-1 uppercase font-bold tracking-widest">{label}</p>
          </div>
        ))}
      </div>

      {/* Table Section */}
      {assetList.length > 0 ? (
        // Menghilangkan glassmorphism, beralih ke warna latar solid bersih (bg-white)
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              {/* Warna latar judul tabel solid bersih (bg-slate-50) */}
              <thead className="bg-slate-50 border-b border-slate-100">
                {/* Teks solid berwarna abu-abu tua */}
                <tr className="text-slate-700 text-[10px] uppercase font-bold tracking-[0.15em]">
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
              {/* Garis pemisah tabel padat bersih */}
              <tbody className="divide-y divide-slate-100">
                {assetList.map((asset) => (
                  // Menghilangkan glassmorphism, beralih ke warna latar solid bersih (bg-white)
                  <tr key={asset.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* ICON WRAPPER DIPERBARUI: Warna latar solid biru muda pucat (bg-indigo-50), bukan transparan */}
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 flex-shrink-0 transition-colors">
                          {assetTypeIcons[asset.type] || <Box className="w-4 h-4 text-indigo-700" />}
                        </div>
                        <div className="min-w-0">
                          {/* Nama asset: Warna solid abu-abu tua (text-slate-800) agar kontras dan terbaca */}
                          <p className="font-bold text-slate-800 text-sm truncate max-w-[180px]">
                            {asset.name}
                          </p>
                          {/* Nama vendor: Warna solid abu-abu lebih terang (text-slate-500) */}
                          {asset.vendor && (
                            <p className="text-[11px] text-slate-500 font-medium truncate">
                              {asset.vendor}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {/* Lencana klasifikasi: Warna solid cerah, bukan pudar */}
                      <span className="text-[10px] font-bold bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 uppercase tracking-tight whitespace-nowrap">
                        {formatAssetType(asset.type)}
                      </span>
                    </td>
                    {/* Teks solid berwarna abu-abu tua */}
                    <td className="px-6 py-4 text-sm text-slate-700 font-medium whitespace-nowrap">
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
                                {/* Teks label solid berwarna abu-abu tua */}
                                <span className="text-[8px] text-slate-800 font-black">{label}</span>
                              </div>
                            )
                          })}
                        </div>
                        {/* Teks skor solid berwarna abu-abu */}
                        <span className="text-xs text-slate-600 font-mono font-bold">
                          {(asset.criticality_score ?? 0).toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {/* Periksa komponen RiskBadge untuk memastikan warna solid cerah */}
                      <RiskBadge level={asset.criticality ?? 'medium'} />
                    </td>
                    {/* Teks solid berwarna abu-abu tua */}
                    <td className="px-6 py-4 text-slate-700 text-xs font-medium">
                      {asset.location || 'Cloud'}
                    </td>
                    {/* Teks tanggal solid berwarna abu-abu */}
                    <td className="px-6 py-4 text-slate-600 text-[11px] font-medium">
                      {asset.created_at ? formatDate(asset.created_at) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* Tombol solid dengan bayangan halus, bukan transparan */}
                      <Link
                        href={`/assets/${asset.id}`}
                        className="p-2 hover:bg-indigo-100/50 rounded-xl inline-flex items-center text-indigo-700 transition-all group-hover:translate-x-1"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Menghilangkan glassmorphism, beralih ke warna latar solid bersih (bg-slate-50) */}
          <div className="lg:hidden py-3 px-6 bg-slate-50 text-center border-t border-slate-100">
            {/* Teks solid berwarna abu-abu */}
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
              ← Swipe to view details →
            </p>
          </div>
        </div>
      ) : (
        // Menghilangkan glassmorphism, beralih ke warna latar solid bersih (bg-white)
        <div className="bg-white rounded-2xl p-12 md:p-24 text-center border border-slate-100 shadow-sm">
          {/* Latar belakang solid biru muda pucat (bg-indigo-50) */}
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-indigo-100 shadow-inner">
            <Server className="w-10 h-10 text-indigo-400" />
          </div>
          {/* Teks judul solid berwarna abu-abu tua */}
          <h3 className="text-xl font-bold text-slate-900 mb-3">Inventory is Empty</h3>
          {/* Teks solid berwarna abu-abu */}
          <p className="text-slate-600 text-sm mb-10 max-w-sm mx-auto leading-relaxed">
            Your organization hasn't tracked any assets yet. Assets are the foundation of your ISO 27001 risk management.
          </p>
          {/* Tombol solid dengan bayangan padat, bukan bayangan transparan */}
          <Link
            href="/assets/new"
            className="inline-flex items-center gap-3 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-lg active:scale-95"
          >
            {/* Ikon teks Plus solid berwarna putih */}
            <Plus className="w-5 h-5 text-white" />
            Add Your First Asset
          </Link>
        </div>
      )}
    </div>
  )
}