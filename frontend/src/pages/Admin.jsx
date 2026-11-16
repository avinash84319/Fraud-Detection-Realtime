import { useState, useEffect, useRef, useCallback } from 'react'
import PipelineStep from '../components/PipelineStep.jsx'
import ShapChart from '../components/ShapChart.jsx'
import LimeChart from '../components/LimeChart.jsx'

const WS_URL = window.location.protocol === 'https:' ? `wss://${window.location.host}/ws` : `ws://${window.location.hostname}:8000/ws`

function formatINR(amount) {
  if (typeof amount !== 'number') amount = parseFloat(amount) || 0
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount)
}

function formatTime(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleTimeString()
  } catch {
    return ts
  }
}

function getStepStatus(stepIndex, txState) {
  // stepIndex: 0=submitted, 1=in_db, 2=features, 3=model
  const ev = txState?.lastEvent
  if (!ev) return 'pending'

  const doneEvents = txState?.doneEvents || []

  const stepDoneMap = [
    ['tx_submitted'],
    ['tx_submitted'],
    ['features_ready'],
    ['inference_done'],
  ]

  const activeMap = [
    [],
    [],
    ['features_started'],
    ['inference_started', 'features_ready'],
  ]

  if (stepDoneMap[stepIndex].some((e) => doneEvents.includes(e))) return 'done'
  if (activeMap[stepIndex].some((e) => doneEvents.includes(e) || ev === e)) return 'active'
  return 'pending'
}

function TxCard({ txState }) {
  const { tx, result, doneEvents = [] } = txState
  const done = doneEvents.includes('inference_done')

  const shapObj = result?.shap_values || result?.shap_json || {}
  const shap = Object.entries(shapObj).map(([name, value]) => ({ name, value }))

  const limeObj = result?.lime_values || result?.lime_json || {}
  const limeRules = Object.entries(limeObj).map(([rule, weight]) => ({
    rule,
    weight: typeof weight === 'number' ? weight : parseFloat(weight) || 0,
  }))

  const [explainTab, setExplainTab] = useState('shap')

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-5 border border-gray-700 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="font-bold text-white text-lg">{tx.merchant}</div>
          <div className="text-sm text-gray-400">
            {formatINR(tx.amount)} · ····{tx.card_last4} · {tx.city || tx.location}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{formatTime(tx.timestamp)}</div>
        </div>
        {done && result && (
          <span
            className={`px-3 py-1 rounded-full text-sm font-bold ${
              result.is_fraud
                ? 'bg-red-600 text-white'
                : 'bg-green-600 text-white'
            }`}
          >
            {result.is_fraud ? '🚨 FRAUD' : '✅ LEGITIMATE'}
          </span>
        )}
      </div>

      {/* Pipeline steps */}
      <div className="flex items-center gap-1">
        {[
          { label: '📥 Submitted', idx: 0 },
          { label: '🗄️ In DB', idx: 1 },
          { label: '⚙️ Features', idx: 2 },
          { label: '🤖 Model', idx: 3 },
        ].map(({ label, idx }, i) => (
          <div key={i} className="flex items-center">
            <PipelineStep
              number={idx + 1}
              label={label}
              status={getStepStatus(idx, txState)}
            />
            {i < 3 && (
              <div
                className={`h-0.5 w-6 mx-1 transition-colors duration-500 ${
                  getStepStatus(idx, txState) === 'done' ? 'bg-green-500' : 'bg-gray-600'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Results section */}
      {done && result && (
        <div className="space-y-3 border-t border-gray-700 pt-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-400">Fraud probability:</span>
            <span
              className={`font-bold text-lg ${
                result.is_fraud ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {(result.fraud_probability * 100).toFixed(1)}%
            </span>
          </div>

          <div className="border border-gray-700 rounded-xl p-3 bg-gray-850/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-300 font-bold uppercase tracking-wide">
                Model Explainability
              </span>
              <div className="flex gap-1 bg-gray-900 p-0.5 rounded-lg border border-gray-700 text-xs">
                <button
                  onClick={() => setExplainTab('shap')}
                  className={`px-2.5 py-1 rounded font-bold text-[11px] transition-colors ${
                    explainTab === 'shap' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🧮 SHAP ({shap.length})
                </button>
                <button
                  onClick={() => setExplainTab('lime')}
                  className={`px-2.5 py-1 rounded font-bold text-[11px] transition-colors ${
                    explainTab === 'lime' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🍋 LIME ({limeRules.length})
                </button>
              </div>
            </div>

            {explainTab === 'shap' ? (
              <ShapChart features={shap} />
            ) : (
              <LimeChart rules={limeRules} />
            )}
          </div>

          {result.llm_explanation && (
            <div className="border-l-4 border-blue-500 pl-3 py-2 bg-gray-900/80 rounded-r-xl text-xs text-gray-200 whitespace-pre-wrap leading-relaxed font-sans">
              {result.llm_explanation}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Admin() {
  // Map: tx_id → { tx, result, doneEvents: string[], lastEvent: string }
  const [txMap, setTxMap] = useState(new Map())
  const [txOrder, setTxOrder] = useState([]) // most recent first
  const wsRef = useRef(null)
  const reconnectRef = useRef(null)

  const updateTx = useCallback((txId, updater) => {
    setTxMap((prev) => {
      const next = new Map(prev)
      const existing = next.get(txId) || { tx: {}, result: null, doneEvents: [], lastEvent: '' }
      next.set(txId, updater(existing))
      return next
    })
  }, [])

  const ensureOrder = useCallback((txId) => {
    setTxOrder((prev) => {
      const filtered = prev.filter((id) => id !== txId)
      return [txId, ...filtered]
    })
  }, [])

  // Load existing transactions on mount
  useEffect(() => {
    fetch('/api/transactions')
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return
        const newMap = new Map()
        const order = []
        for (const item of data) {
          const txId = item.id
          order.push(txId)
          const doneEvents = []
          if (item.status === 'submitted') doneEvents.push('tx_submitted')
          if (item.status === 'features_ready') {
            doneEvents.push('tx_submitted', 'features_ready')
          }
          if (item.status === 'inference_done') {
            doneEvents.push('tx_submitted', 'features_ready', 'inference_done')
          }
          const res = item.result || (item.is_fraud !== null && item.is_fraud !== undefined ? {
            is_fraud: Boolean(item.is_fraud),
            fraud_probability: typeof item.fraud_probability === 'number' ? item.fraud_probability : 0.0,
            shap_values: item.shap_json || item.shap_values || {},
            llm_explanation: item.llm_explanation || '',
          } : null)
          newMap.set(txId, {
            tx: item,
            result: res,
            doneEvents,
            lastEvent: doneEvents[doneEvents.length - 1] || '',
          })
        }
        setTxMap(newMap)
        setTxOrder(order)
      })
      .catch(() => {})
  }, [])

  // WebSocket connection with reconnect
  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          const { event, tx_id, data } = msg
          if (!tx_id) return

          if (event === 'tx_submitted') {
            ensureOrder(tx_id)
            updateTx(tx_id, (prev) => ({
              ...prev,
              tx: data || prev.tx,
              doneEvents: ['tx_submitted'],
              lastEvent: 'tx_submitted',
            }))
          } else if (event === 'features_started') {
            updateTx(tx_id, (prev) => ({
              ...prev,
              lastEvent: 'features_started',
            }))
          } else if (event === 'features_ready') {
            updateTx(tx_id, (prev) => ({
              ...prev,
              doneEvents: [...new Set([...prev.doneEvents, 'features_ready'])],
              lastEvent: 'features_ready',
            }))
          } else if (event === 'inference_started') {
            updateTx(tx_id, (prev) => ({
              ...prev,
              lastEvent: 'inference_started',
            }))
          } else if (event === 'inference_done') {
            updateTx(tx_id, (prev) => ({
              ...prev,
              result: data || prev.result,
              doneEvents: [...new Set([...prev.doneEvents, 'inference_done'])],
              lastEvent: 'inference_done',
            }))
          }
        } catch {}
      }

      ws.onclose = () => {
        reconnectRef.current = setTimeout(connect, 2000)
      }
      ws.onerror = () => ws.close()
    }

    connect()
    return () => {
      clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [updateTx, ensureOrder])

  const txList = txOrder.map((id) => [id, txMap.get(id)]).filter(([, v]) => v)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">⚙️ Admin Pipeline Monitor</h1>
        <p className="text-gray-400 text-sm mt-1">
          Real-time 4-step fraud detection pipeline · {txList.length} transaction
          {txList.length !== 1 ? 's' : ''}
        </p>
      </div>

      {txList.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-lg">No transactions yet.</p>
          <p className="text-sm mt-2">
            Go to the <span className="text-blue-400">Transactor</span> page to send one.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {txList.map(([id, state]) => (
            <TxCard key={id} txState={state} />
          ))}
        </div>
      )}
    </div>
  )
}
