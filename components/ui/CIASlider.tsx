'use client'

interface CIASliderProps {
  label: string
  name: string
  value: number
  onChange: (value: number) => void
  description?: string
}

const levels = [
  { val: 1, label: 'Very Low',  short: 'VL', color: 'bg-green-500',  border: 'border-green-500',  text: 'text-green-300',  activeText: 'text-green-950',  glow: 'shadow-green-500/40'  },
  { val: 2, label: 'Low',       short: 'L',  color: 'bg-lime-500',   border: 'border-lime-500',   text: 'text-lime-300',   activeText: 'text-lime-950',   glow: 'shadow-lime-500/40'   },
  { val: 3, label: 'Medium',    short: 'M',  color: 'bg-yellow-400', border: 'border-yellow-400', text: 'text-yellow-300', activeText: 'text-yellow-950', glow: 'shadow-yellow-500/40' },
  { val: 4, label: 'High',      short: 'H',  color: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-300', activeText: 'text-white',      glow: 'shadow-orange-500/40' },
  { val: 5, label: 'Very High', short: 'VH', color: 'bg-red-500',    border: 'border-red-500',    text: 'text-red-300',    activeText: 'text-white',      glow: 'shadow-red-500/40'    },
]

const ciaColor: Record<string, string> = {
  'Confidentiality (C)': 'from-blue-500 to-blue-600',
  'Integrity (I)':       'from-purple-500 to-purple-600',
  'Availability (A)':    'from-cyan-500 to-cyan-600',
}

const ciaAccent: Record<string, string> = {
  'Confidentiality (C)': 'text-blue-400',
  'Integrity (I)':       'text-purple-400',
  'Availability (A)':    'text-cyan-400',
}

export default function CIASlider({ label, name, value, onChange, description }: CIASliderProps) {
  const current = levels.find(l => l.val === value) || levels[2]
  const gradient = ciaColor[label] || 'from-brand-500 to-brand-600'
  const accentText = ciaAccent[label] || 'text-brand-400'
  const fillPct = ((value - 1) / 4) * 100

  return (
    <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-4 transition-all hover:border-slate-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className={`text-sm font-semibold ${accentText}`}>{label}</p>
          {description && <p className="text-xs text-slate-500 mt-0.5 max-w-xs">{description}</p>}
        </div>
        {/* Badge nilai */}
        <div className={`flex-shrink-0 ml-4 px-3 py-1.5 rounded-lg border ${current.border} bg-slate-800/80 text-center min-w-[72px]`}>
          <p className={`text-lg font-bold leading-none ${current.text}`}>{value}</p>
          <p className={`text-[10px] font-medium mt-0.5 ${current.text}`}>{current.label}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-slate-800 rounded-full mb-3 overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-300 ease-out`}
          style={{ width: `${fillPct === 0 ? 8 : fillPct}%` }}
        />
      </div>

      {/* Tombol level */}
      <div className="grid grid-cols-5 gap-1.5">
        {levels.map(lvl => {
          const isActive = value === lvl.val
          const isPast = value > lvl.val

          return (
            <button
              key={lvl.val}
              type="button"
              onClick={() => onChange(lvl.val)}
              className={`
                relative py-2 rounded-lg text-center transition-all duration-150 border
                ${isActive
                  ? `${lvl.color} border-transparent ${lvl.activeText} font-bold shadow-lg ${lvl.glow}`
                  : isPast
                    ? `bg-slate-800/60 ${lvl.border}/30 ${lvl.text}`
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }
              `}
            >
              <p className="text-[11px] font-semibold leading-none">{lvl.short}</p>
              <p className="text-[9px] mt-0.5 opacity-75">{lvl.val}</p>
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white shadow" />
              )}
            </button>
          )
        })}
      </div>

      {/* Label bawah */}
      <div className="flex justify-between text-[9px] text-slate-600 mt-1.5 px-0.5">
        <span>Very Low</span>
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
        <span>Very High</span>
      </div>
    </div>
  )
}