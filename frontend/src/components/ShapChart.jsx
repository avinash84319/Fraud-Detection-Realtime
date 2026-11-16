// ShapChart.jsx
// Modern horizontal bar chart for SHAP values
// Props: { features: [{name: string, value: number}] }

export default function ShapChart({ features }) {
  if (!features || features.length === 0) {
    return <p className="text-gray-500 text-sm italic py-2">No SHAP attribution data available.</p>
  }

  const maxAbs = Math.max(...features.map((f) => Math.abs(f.value)), 0.0001)

  return (
    <div className="space-y-2.5">
      {features.map((f, i) => {
        const pct = Math.min(Math.round((Math.abs(f.value) / maxAbs) * 100), 100)
        const isPositive = f.value >= 0

        return (
          <div key={i} className="flex flex-col gap-1 bg-gray-900/60 p-2.5 rounded-xl border border-gray-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-gray-200 font-semibold truncate" title={f.name}>
                {f.name}
              </span>
              <span
                className={`font-mono font-bold shrink-0 ml-2 ${
                  isPositive ? 'text-red-400' : 'text-blue-400'
                }`}
              >
                {isPositive ? '+' : ''}
                {f.value.toFixed(3)}
              </span>
            </div>
            <div className="bg-gray-800 rounded-full h-2.5 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isPositive ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-blue-600 to-blue-400'
                }`}
                style={{ width: `${Math.max(pct, 4)}%` }}
              />
            </div>
          </div>
        )
      })}
      <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          <span>Positive SHAP → Shifts Towards Fraud</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
          <span>Negative SHAP → Shifts Towards Safe</span>
        </span>
      </div>
    </div>
  )
}
