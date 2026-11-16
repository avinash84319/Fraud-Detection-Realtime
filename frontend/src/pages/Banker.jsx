import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ShapChart from '../components/ShapChart.jsx'
import LimeChart from '../components/LimeChart.jsx'

const WS_URL = window.location.protocol === 'https:' ? `wss://${window.location.host}/ws` : `ws://${window.location.hostname}:8000/ws`

const CATEGORY_ICONS = {
  grocery: '🛒',
  online_retail: '📦',
  retail: '🛍️',
  hotel: '🏨',
  travel: '✈️',
  pharmacy: '💊',
  food_delivery: '🍔',
  gas_station: '⛽',
  electronics: '💻',
  clothing: '👗',
  subscription: '🔁',
  digital_goods: '📱',
  gambling: '🎰',
  financial_services: '💰',
  luxury: '💎',
  default: '💳',
}

function getCategoryIcon(cat, merchant = '') {
  const m = merchant.toLowerCase()
  if (m.includes('casino') || m.includes('bet')) return '🎰'
  if (m.includes('crypto') || m.includes('fx') || m.includes('trading')) return '🪙'
  if (m.includes('amazon')) return '📦'
  if (m.includes('apple')) return '🍎'
  if (m.includes('flight') || m.includes('airline') || m.includes('delta')) return '✈️'
  if (m.includes('hotel') || m.includes('marriott')) return '🏨'
  if (m.includes('gas') || m.includes('shell')) return '⛽'
  if (m.includes('uber')) return '🚗'
  if (m.includes('spotify') || m.includes('netflix')) return '🍿'
  if (m.includes('zara')) return '👗'
  if (m.includes('best buy')) return '💻'
  return CATEGORY_ICONS[cat?.toLowerCase()] || CATEGORY_ICONS.default
}

function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatRelativeTime(ts) {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    const now = new Date()
    const diffSec = Math.round((now - d) / 1000)
    if (diffSec < 45) return 'Just now'
    if (diffSec < 90) return '1m ago'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts
  }
}

function formatDateTime(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return ts
  }
}

function extractResult(item) {
  if (!item) return null
  if (item.result) {
    return {
      is_fraud: Boolean(item.result.is_fraud),
      fraud_probability: typeof item.result.fraud_probability === 'number' ? item.result.fraud_probability : 0.0,
      shap_values: item.result.shap_values || item.result.shap_json || {},
      lime_values: item.result.lime_values || item.result.lime_json || {},
      llm_explanation: item.result.llm_explanation || '',
    }
  }
  if (item.is_fraud !== null && item.is_fraud !== undefined) {
    return {
      is_fraud: Boolean(item.is_fraud),
      fraud_probability: typeof item.fraud_probability === 'number' ? item.fraud_probability : 0.0,
      shap_values: item.shap_json || item.shap_values || {},
      lime_values: item.lime_json || item.lime_values || {},
      llm_explanation: item.llm_explanation || '',
    }
  }
  return null
}

function NotifyModal({ tx, result, onClose }) {
  const isFraud = Boolean(result?.is_fraud)
  const defaultMsg = isFraud
    ? `URGENT SECURITY ALERT\n\nDear Customer,\n\nOur real-time fraud prevention systems have flagged a suspicious charge of ${formatUSD(tx.amount)} at ${tx.merchant} on ${formatDateTime(tx.timestamp)}.\n\nCard: ····${tx.card_last4 || '----'}\nRisk Level: HIGH (${((result?.fraud_probability || 1) * 100).toFixed(0)}% confidence score)\nReason: Unusual merchant category / nocturnal cross-border activity.\n\nIf you DID NOT authorize this payment, please reply immediately or contact our Fraud Desk at 1-800-555-0199 to freeze your card.\n\nSecurity Operations Team\nFraudGuard Bank`
    : `TRANSACTION CONFIRMATION\n\nDear Customer,\n\nYour transaction of ${formatUSD(tx.amount)} at ${tx.merchant} on ${formatDateTime(tx.timestamp)} was verified and cleared.\n\nCard: ····${tx.card_last4 || '----'}\nStatus: Verified Legitimate (Risk: Safe)\n\nThank you for choosing FraudGuard.\n\nCustomer Support Team\nFraudGuard Bank`

  const [message, setMessage] = useState(defaultMsg)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSend() {
    setSending(true)
    try {
      await fetch(`/api/transaction/${tx.id}/notify-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      setSent(true)
      setTimeout(onClose, 1400)
    } catch {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-gray-700 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📧</span>
            <h3 className="text-lg font-bold text-white">Direct Cardholder Dispatch</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">
            &times;
          </button>
        </div>
        {sent ? (
          <div className="text-center py-8 text-green-400 font-semibold text-lg animate-bounce">
            ✅ Alert dispatched to customer device successfully!
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400">
              Review and adjust the automated incident notification before sending:
            </p>
            <textarea
              className="w-full h-56 bg-gray-900 border border-gray-700 rounded-xl p-3.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-mono leading-relaxed resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className={`px-5 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-2 shadow-lg ${
                  isFraud ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {sending ? 'Sending…' : '📤 Dispatch Alert'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function DetailPanel({ txState, onNotify }) {
  const [activeExplainTab, setActiveExplainTab] = useState('shap') // 'shap' | 'lime'

  if (!txState) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 p-8">
        <div className="text-center max-w-sm space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 mx-auto flex items-center justify-center text-3xl shadow-inner">
            👈
          </div>
          <h3 className="text-lg font-bold text-gray-200">Select a Transaction</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Choose any transaction from the live monitor on the left to review its AI fraud decision, SHAP & LIME explainability, and contextual behavioral analysis.
          </p>
        </div>
      </div>
    )
  }

  const { tx, result, lastEvent, doneEvents = [] } = txState
  const isDone =
    lastEvent === 'inference_done' ||
    doneEvents.includes('inference_done') ||
    tx?.status === 'inference_done' ||
    result != null

  const isFraud = Boolean(result?.is_fraud)
  const prob = result?.fraud_probability ?? 0

  // SHAP data
  const rawShap = result?.shap_values || result?.shap_json || {}
  const shapList = Object.entries(rawShap).map(([name, value]) => ({
    name,
    value: typeof value === 'number' ? value : parseFloat(value) || 0,
  }))

  // LIME data
  const rawLime = result?.lime_values || result?.lime_json || {}
  const limeList = Object.entries(rawLime).map(([rule, weight]) => ({
    rule,
    weight: typeof weight === 'number' ? weight : parseFloat(weight) || 0,
  }))

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl">
      {/* 1. Hero Verdict Banner */}
      {isDone && result ? (
        <div
          className={`rounded-2xl p-6 border shadow-2xl relative overflow-hidden flex items-center justify-between flex-wrap gap-4 ${
            isFraud
              ? 'bg-gradient-to-r from-red-950 via-red-900/80 to-gray-900 border-red-600/70 shadow-red-950/40'
              : 'bg-gradient-to-r from-emerald-950 via-emerald-900/80 to-gray-900 border-emerald-600/70 shadow-emerald-950/40'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg border ${
                isFraud ? 'bg-red-600 text-white border-red-400' : 'bg-emerald-600 text-white border-emerald-400'
              }`}
            >
              {isFraud ? '🚨' : '🛡️'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${
                    isFraud ? 'bg-red-500 text-white shadow-sm' : 'bg-emerald-500 text-white shadow-sm'
                  }`}
                >
                  {isFraud ? 'HIGH RISK FRAUD' : 'CLEARED LEGITIMATE'}
                </span>
                <span className="text-xs text-gray-400 font-mono">TX-{tx.id?.slice(0, 8)}</span>
              </div>
              <h1 className="text-2xl font-black text-white mt-1">
                {isFraud ? 'Fraudulent Transaction Detected' : 'Legitimate Transaction Approved'}
              </h1>
              <p className="text-xs text-gray-300 max-w-xl mt-0.5 leading-relaxed">
                {isFraud
                  ? 'Multi-model ensemble (RandomForest + SHAP + LIME) identified severe anomaly signatures.'
                  : 'Transaction metrics align seamlessly with baseline consumer spending habits.'}
              </p>
            </div>
          </div>

          {/* Probability Gauge Card */}
          <div className="bg-gray-900/90 rounded-2xl p-4 border border-gray-700 min-w-[210px] text-right shadow-inner">
            <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Fraud Probability</div>
            <div className={`text-3xl font-black ${isFraud ? 'text-red-400' : 'text-emerald-400'}`}>
              {(prob * 100).toFixed(1)}%
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2.5 mt-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isFraud ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                }`}
                style={{ width: `${Math.max(prob * 100, 4)}%` }}
              />
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              {isFraud ? 'Requires immediate action' : 'Automated bypass granted'}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-900/40 border border-blue-500 flex items-center justify-center text-2xl animate-spin">
            ⚙️
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Pipeline Executing</h3>
            <p className="text-xs text-gray-400">
              Current state: <span className="text-blue-400 font-semibold">{lastEvent || tx?.status || 'Analyzing'}</span>
            </p>
          </div>
        </div>
      )}

      {/* 2. Transaction Profile Details */}
      <div className="bg-gray-800/90 rounded-2xl p-5 border border-gray-700/80 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-gray-700/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getCategoryIcon(tx.category, tx.merchant)}</span>
            <h2 className="text-sm font-bold text-white">Transaction Profile</h2>
          </div>
          <span className="text-xs font-mono text-gray-400">{tx.id}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-800">
            <div className="text-gray-400 mb-0.5">Merchant</div>
            <div className="text-white font-bold text-sm truncate">{tx.merchant}</div>
          </div>
          <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-800">
            <div className="text-gray-400 mb-0.5">Amount</div>
            <div className="text-blue-300 font-black text-sm">{formatUSD(tx.amount)}</div>
          </div>
          <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-800">
            <div className="text-gray-400 mb-0.5">Card Number</div>
            <div className="text-white font-mono font-semibold">····{tx.card_last4 || '----'}</div>
          </div>
          <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-800">
            <div className="text-gray-400 mb-0.5">Processing Location</div>
            <div className="text-white font-medium truncate">{tx.city || tx.location || 'US'}, {tx.country || ''}</div>
          </div>
          <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-800">
            <div className="text-gray-400 mb-0.5">Category</div>
            <div className="text-white capitalize font-medium">{tx.category || 'N/A'}</div>
          </div>
          <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-800">
            <div className="text-gray-400 mb-0.5">Cardholder ID</div>
            <div className="text-white font-mono truncate">{tx.user_id || 'N/A'}</div>
          </div>
          <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-800 sm:col-span-2">
            <div className="text-gray-400 mb-0.5">Submission Timestamp</div>
            <div className="text-white font-medium">{formatDateTime(tx.timestamp)}</div>
          </div>
        </div>
      </div>

      {/* 3. AI Contextual & Behavioral Explanation */}
      {isDone && result?.llm_explanation && (
        <div className="bg-gray-800/90 rounded-2xl p-5 border border-gray-700/80 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-gray-700/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div>
                <h2 className="text-sm font-bold text-white">Contextual Risk & Behavioral Analysis</h2>
                <p className="text-[11px] text-gray-400">Ground-truth domain reasoning covering merchant reputation, temporal windows, and location corridors</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/50">
              Domain-Aware AI
            </span>
          </div>

          <div className="bg-gray-900/80 rounded-xl p-4 border border-gray-700/80 text-xs text-gray-200 leading-relaxed font-sans whitespace-pre-wrap">
            {result.llm_explanation}
          </div>
        </div>
      )}

      {/* 4. Dual Explainability Engine: SHAP & LIME */}
      {isDone && result && (
        <div className="bg-gray-800/90 rounded-2xl p-5 border border-gray-700/80 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-gray-700/80 pb-3 flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🔬</span> Model Explainability Hub
              </h2>
              <p className="text-[11px] text-gray-400">Compare global feature attribution (SHAP) against local surrogate decision boundaries (LIME)</p>
            </div>

            {/* Switcher Tabs */}
            <div className="flex items-center bg-gray-900 p-1 rounded-xl border border-gray-700 text-xs">
              <button
                onClick={() => setActiveExplainTab('shap')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeExplainTab === 'shap'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>🧮 SHAP Values</span>
                <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full">{shapList.length}</span>
              </button>
              <button
                onClick={() => setActiveExplainTab('lime')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeExplainTab === 'lime'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>🍋 LIME Rules</span>
                <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full">{limeList.length}</span>
              </button>
            </div>
          </div>

          {activeExplainTab === 'shap' ? (
            <div className="space-y-3">
              <div className="text-xs text-gray-300">
                <span className="font-semibold text-white">SHAP (SHapley Additive exPlanations):</span> Quantifies the additive marginal contribution of each input feature towards the final fraud probability.
              </div>
              <ShapChart features={shapList} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-gray-300">
                <span className="font-semibold text-white">LIME (Local Interpretable Model-agnostic Explanations):</span> Builds an interpretable local surrogate model around this exact transaction to extract threshold-based decision rules.
              </div>
              <LimeChart rules={limeList} />
            </div>
          )}
        </div>
      )}

      {/* 5. Extracted Model Features Card */}
      {tx.feature_json && (
        <div className="bg-gray-800/80 rounded-2xl p-5 border border-gray-700/80">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>⚙️</span> Raw Engineered Model Vector
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {Object.entries(tx.feature_json).map(([k, v]) => (
              <div key={k} className="bg-gray-900 p-2.5 rounded-xl border border-gray-800/80">
                <div className="text-gray-400 text-[10px] truncate mb-0.5">{k}</div>
                <div className="text-white font-mono font-bold truncate">
                  {typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(3)) : String(v)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. One-Click Customer Notification Action */}
      {isDone && (
        <button
          onClick={onNotify}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xl ${
            isFraud
              ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-red-950/50'
              : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-950/50'
          }`}
        >
          <span>📧</span>
          <span>{isFraud ? 'Send Urgent Fraud Alert to Cardholder' : 'Send Transaction Confirmation to Cardholder'}</span>
        </button>
      )}
    </div>
  )
}

export default function Banker() {
  const [txMap, setTxMap] = useState(new Map())
  const [txOrder, setTxOrder] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [showNotify, setShowNotify] = useState(false)
  const [filterMode, setFilterMode] = useState('all') // 'all' | 'fraud' | 'safe'
  const [searchQuery, setSearchQuery] = useState('')
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

  // Ensure most recent transaction is always at index 0 (top)
  const prependOrder = useCallback((txId) => {
    setTxOrder((prev) => {
      const filtered = prev.filter((id) => id !== txId)
      return [txId, ...filtered]
    })
  }, [])

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
          if (['submitted', 'features_ready', 'inference_done'].includes(item.status)) {
            doneEvents.push('tx_submitted')
          }
          if (['features_ready', 'inference_done'].includes(item.status)) {
            doneEvents.push('features_ready')
          }
          if (item.status === 'inference_done') doneEvents.push('inference_done')

          const res = extractResult(item)

          newMap.set(txId, {
            tx: item,
            result: res,
            doneEvents,
            lastEvent: item.status === 'inference_done' ? 'inference_done' : item.status || '',
          })
        }
        setTxMap(newMap)
        setTxOrder(order)
        if (order.length > 0) setSelectedId(order[0])
      })
      .catch((err) => console.error('Failed to load transactions:', err))
  }, [])

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
            prependOrder(tx_id)
            setSelectedId(tx_id) // Auto-focus newest transaction
            updateTx(tx_id, (prev) => ({
              ...prev,
              tx: data || prev.tx,
              doneEvents: ['tx_submitted'],
              lastEvent: 'tx_submitted',
            }))
          } else if (event === 'features_started') {
            updateTx(tx_id, (prev) => ({ ...prev, lastEvent: 'features_started' }))
          } else if (event === 'features_ready') {
            updateTx(tx_id, (prev) => ({
              ...prev,
              doneEvents: [...new Set([...prev.doneEvents, 'features_ready'])],
              lastEvent: 'features_ready',
            }))
          } else if (event === 'inference_started') {
            updateTx(tx_id, (prev) => ({ ...prev, lastEvent: 'inference_started' }))
          } else if (event === 'inference_done') {
            const res = extractResult({ result: data })
            updateTx(tx_id, (prev) => ({
              ...prev,
              result: res || prev.result,
              doneEvents: [...new Set([...prev.doneEvents, 'inference_done'])],
              lastEvent: 'inference_done',
            }))
          }
        } catch (err) {
          console.error('WebSocket parse error:', err)
        }
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
  }, [updateTx, prependOrder])

  // Counts for top bar
  const counts = useMemo(() => {
    let total = txOrder.length
    let fraud = 0
    let safe = 0
    for (const id of txOrder) {
      const s = txMap.get(id)
      if (s?.result) {
        if (s.result.is_fraud) fraud++
        else safe++
      }
    }
    return { total, fraud, safe }
  }, [txOrder, txMap])

  // Filtered order list
  const filteredOrder = useMemo(() => {
    return txOrder.filter((id) => {
      const s = txMap.get(id)
      if (!s) return false

      if (filterMode === 'fraud') {
        if (!s.result || !s.result.is_fraud) return false
      } else if (filterMode === 'safe') {
        if (!s.result || s.result.is_fraud) return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const merchant = (s.tx?.merchant || '').toLowerCase()
        const card = (s.tx?.card_last4 || '').toLowerCase()
        const user = (s.tx?.user_id || '').toLowerCase()
        const amount = String(s.tx?.amount || '')
        if (!merchant.includes(q) && !card.includes(q) && !user.includes(q) && !amount.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [txOrder, txMap, filterMode, searchQuery])

  const selectedState = selectedId ? txMap.get(selectedId) : null

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden bg-gray-900">
      {/* ============================================================== */}
      {/* Modern Redesigned Left Sidebar */}
      {/* ============================================================== */}
      <div className="w-96 lg:w-[410px] shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col overflow-hidden shadow-2xl">
        {/* Top Header & Live Status */}
        <div className="p-4 border-b border-gray-800/80 space-y-3.5 bg-gray-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="font-extrabold text-white text-sm tracking-wide">Fraud Monitor Stream</h2>
            </div>
            <span className="text-[11px] font-mono text-gray-400 bg-gray-900 px-2 py-0.5 rounded-md border border-gray-800">
              {filteredOrder.length} / {counts.total} items
            </span>
          </div>

          {/* Quick Stats Pill Bar */}
          <div className="grid grid-cols-3 gap-1.5 bg-gray-900 p-1.5 rounded-xl border border-gray-800/90 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                filterMode === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>All</span>
              <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full">{counts.total}</span>
            </button>
            <button
              onClick={() => setFilterMode('fraud')}
              className={`py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                filterMode === 'fraud'
                  ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
                  : 'text-red-400 hover:text-red-300 hover:bg-red-950/30'
              }`}
            >
              <span>🚨 Fraud</span>
              <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full font-black">{counts.fraud}</span>
            </button>
            <button
              onClick={() => setFilterMode('safe')}
              className={`py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                filterMode === 'safe'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30'
              }`}
            >
              <span>✅ Safe</span>
              <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full font-black">{counts.safe}</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-500 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Filter by merchant, card (4521), amount…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900/90 border border-gray-800 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Transaction List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-850 p-2 space-y-1.5">
          {filteredOrder.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs space-y-2">
              <div className="text-3xl">📭</div>
              <p className="font-semibold text-gray-400">No transactions found</p>
              <p className="text-[11px] text-gray-600">Try adjusting your search query or switching filters.</p>
            </div>
          ) : (
            filteredOrder.map((id) => {
              const state = txMap.get(id)
              if (!state) return null
              const { tx, result } = state
              const isSelected = id === selectedId
              const icon = getCategoryIcon(tx.category, tx.merchant)
              const isFraud = result?.is_fraud

              return (
                <button
                  key={id}
                  onClick={() => setSelectedId(id)}
                  className={`w-full text-left p-3.5 rounded-xl transition-all flex items-start gap-3 border ${
                    isSelected
                      ? isFraud
                        ? 'bg-red-950/50 border-red-500/80 shadow-lg shadow-red-950/30'
                        : 'bg-blue-950/50 border-blue-500/80 shadow-lg shadow-blue-950/30'
                      : 'bg-gray-900/50 hover:bg-gray-900 border-gray-850 hover:border-gray-750'
                  }`}
                >
                  {/* Category / Merchant Avatar */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
                      isFraud
                        ? 'bg-red-900/40 border-red-700/60 text-red-200'
                        : 'bg-gray-800 border-gray-700 text-gray-200'
                    }`}
                  >
                    {icon}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-bold text-white text-xs truncate">{tx.merchant}</span>
                      <span className="text-blue-300 font-black text-xs shrink-0">{formatUSD(tx.amount)}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
                      <span className="font-mono">····{tx.card_last4 || '----'}</span>
                      <span className="text-gray-500">{formatRelativeTime(tx.timestamp)}</span>
                    </div>

                    {/* Bottom Status Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {result ? (
                        isFraud ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1 shadow-sm">
                            <span>🚨 FRAUD</span>
                            <span className="text-red-200 font-normal">({Math.round((result.fraud_probability ?? 1) * 100)}%)</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-700 text-white flex items-center gap-1 shadow-sm">
                            <span>✅ SAFE</span>
                            <span className="text-emerald-200 font-normal">({Math.round((1 - (result.fraud_probability ?? 0)) * 100)}%)</span>
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/70 text-amber-300 border border-amber-700 animate-pulse">
                          Analyzing…
                        </span>
                      )}

                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700/60 capitalize">
                        {tx.city || tx.location || 'US'}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* Right Detail Panel */}
      {/* ============================================================== */}
      <div className="flex-1 overflow-hidden flex flex-col bg-gray-900">
        <DetailPanel txState={selectedState} onNotify={() => setShowNotify(true)} />
      </div>

      {/* Notification Modal */}
      {showNotify && selectedState && (
        <NotifyModal
          tx={selectedState.tx}
          result={selectedState.result}
          onClose={() => setShowNotify(false)}
        />
      )}
    </div>
  )
}
