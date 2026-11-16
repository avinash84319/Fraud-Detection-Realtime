// PipelineStep.jsx
// Props: { number, label, status: 'pending' | 'active' | 'done' }

export default function PipelineStep({ number, label, status }) {
  const bubbleClass =
    status === 'done'
      ? 'bg-green-500 border-green-400 text-white shadow-green-500/50 shadow-md'
      : status === 'active'
      ? 'bg-yellow-500 border-yellow-400 text-white shadow-yellow-500/50 shadow-md animate-pulse'
      : 'bg-gray-700 border-gray-600 text-gray-400'

  const labelClass =
    status === 'done'
      ? 'text-green-400 font-semibold'
      : status === 'active'
      ? 'text-yellow-400 font-semibold'
      : 'text-gray-500'

  return (
    <div className="flex flex-col items-center gap-1 min-w-[70px]">
      <div
        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all duration-500 ${bubbleClass}`}
      >
        {status === 'done' ? '✓' : number}
      </div>
      <span className={`text-xs text-center transition-colors duration-500 ${labelClass}`}>
        {label}
      </span>
    </div>
  )
}
