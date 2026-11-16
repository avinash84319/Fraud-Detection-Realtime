import { useState, useEffect, useMemo } from 'react'

const CATEGORY_ICONS = {
  grocery: '🛒',
  hotel: '🏨',
  travel: '✈️',
  pharmacy: '💊',
  food_delivery: '🍔',
  gas_station: '⛽',
  electronics: '💻',
  clothing: '👗',
  entertainment: '🎭',
  online_retail: '📦',
  financial_services: '💰',
  gambling: '🎰',
  luxury: '💎',
  digital_goods: '📱',
  subscription: '🔁',
  default: '🏪',
}

function categoryIcon(category) {
  if (!category) return CATEGORY_ICONS.default
  const c = category.toLowerCase()
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (c.includes(key)) return icon
  }
  return CATEGORY_ICONS.default
}

function formatINR(amount) {
  if (typeof amount !== 'number') amount = parseFloat(amount) || 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce border border-emerald-400">
      <span className="text-xl">✅</span>
      <span className="font-bold text-sm tracking-wide">{message}</span>
    </div>
  )
}

function TransactionCard({ tx, onSend, sending }) {
  const isFraud = tx.expected_type === 'fraud'

  return (
    <div className="bg-gray-800/90 rounded-2xl p-5 border border-gray-700/80 hover:border-blue-500/80 transition-all shadow-xl flex flex-col justify-between h-full space-y-4">
      {/* Top Profile Banner */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-700/60 pb-3">
        <span
          className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm ${
            isFraud
              ? 'bg-red-500/20 text-red-300 border border-red-500/60'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60'
          }`}
        >
          <span>{isFraud ? '🚨' : '🟢'}</span>
          <span>{isFraud ? 'Fraud Profile' : 'Normal Profile'}</span>
        </span>
        <span className="text-[11px] text-gray-400 font-mono">····{tx.card_last4}</span>
      </div>

      {/* Complete Merchant & Amount Box */}
      <div className="bg-gray-900/90 rounded-xl p-3.5 border border-gray-800 flex items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-xl shrink-0">
            {categoryIcon(tx.category)}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-sm truncate" title={tx.merchant}>
              {tx.merchant}
            </h3>
            <p className="text-[11px] text-gray-400 capitalize truncate">{tx.category?.replace(/_/g, ' ')}</p>
          </div>
        </div>

        {/* Amount Box */}
        <div className="text-right shrink-0">
          <div className="text-xs text-gray-400 uppercase font-bold text-[10px]">Amount</div>
          <div className="text-base font-black text-amber-300 tracking-tight">
            {formatINR(tx.amount)}
          </div>
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-gray-900/50 p-2 rounded-lg border border-gray-800 text-gray-300 flex items-center gap-1.5 truncate">
          <span>📍</span>
          <span className="truncate">{tx.city || tx.location}, {tx.country || 'US'}</span>
        </div>
        <div className="bg-gray-900/50 p-2 rounded-lg border border-gray-800 text-gray-300 flex items-center gap-1.5 truncate">
          <span>🕐</span>
          <span className="truncate">{tx.hour_of_day}:00 ({tx.is_weekend ? 'Weekend' : 'Weekday'})</span>
        </div>
      </div>

      {/* Profile Risk Explanation Tag */}
      {tx.risk_indicator && (
        <div className={`p-2 rounded-lg text-[10px] font-medium leading-tight border ${
          isFraud ? 'bg-red-950/40 text-red-300 border-red-900/50' : 'bg-emerald-950/40 text-emerald-300 border-emerald-900/50'
        }`}>
          {isFraud ? '⚠️ Risk Indicator: ' : 'ℹ️ Profile Note: '}
          {tx.risk_indicator}
        </div>
      )}

      {/* Pinned Full-Width Action Button */}
      <button
        onClick={() => onSend(tx)}
        disabled={sending}
        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
          isFraud
            ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-950/40'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-950/40'
        } disabled:bg-gray-700 disabled:cursor-not-allowed`}
      >
        {sending ? (
          <span>⏳ Dispatching…</span>
        ) : (
          <>
            <span>{isFraud ? '🚨' : '🚀'}</span>
            <span>{isFraud ? 'Test Fraud Transaction' : 'Test Normal Transaction'}</span>
          </>
        )}
      </button>
    </div>
  )
}

export default function Transactor() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [sendingId, setSendingId] = useState(null)
  const [filterType, setFilterType] = useState('all') // 'all' | 'normal' | 'fraud'
  const [recentlySent, setRecentlySent] = useState(() => {
    try {
      const saved = localStorage.getItem('fraudguard_recently_sent')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    fetch('/api/sample-transactions')
      .then((r) => r.json())
      .then((data) => {
        setTransactions(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Persist recentlySent in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('fraudguard_recently_sent', JSON.stringify(recentlySent))
    } catch {}
  }, [recentlySent])

  async function sendTransaction(rawTx) {
    const now = new Date()
    const tx = {
      ...rawTx,
      id: crypto.randomUUID(),
      timestamp: now.toISOString(),
      hour_of_day: now.getHours(),
      day_of_week: now.getDay(),
      is_weekend: [0, 6].includes(now.getDay()) ? 1 : 0,
    }
    setSendingId(rawTx.id)
    try {
      const res = await fetch('/api/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx),
      })
      if (res.ok) {
        setToast(`Submitted ${tx.merchant} (${formatINR(tx.amount)})!`)
        setRecentlySent((prev) => [tx, ...prev.filter((item) => item.id !== tx.id)].slice(0, 10))
      } else {
        setToast('Error submitting transaction')
      }
    } catch {
      setToast('Network error – backend unreachable')
    } finally {
      setSendingId(null)
    }
  }

  function sendRandomNormal() {
    const normals = transactions.filter((t) => t.expected_type === 'normal')
    if (normals.length === 0) return
    const pick = normals[Math.floor(Math.random() * normals.length)]
    sendTransaction(pick)
  }

  function sendRandomFraud() {
    const frauds = transactions.filter((t) => t.expected_type === 'fraud')
    if (frauds.length === 0) return
    const pick = frauds[Math.floor(Math.random() * frauds.length)]
    sendTransaction(pick)
  }

  const filteredTransactions = useMemo(() => {
    if (filterType === 'normal') return transactions.filter((t) => t.expected_type === 'normal')
    if (filterType === 'fraud') return transactions.filter((t) => t.expected_type === 'fraud')
    return transactions
  }, [transactions, filterType])

  const counts = useMemo(() => {
    const normalCount = transactions.filter((t) => t.expected_type === 'normal').length
    const fraudCount = transactions.filter((t) => t.expected_type === 'fraud').length
    return { all: transactions.length, normal: normalCount, fraud: fraudCount }
  }, [transactions])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8 flex-col lg:flex-row">
      {/* Main Cards Area */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header with Quick Dispatch Actions */}
        <div className="bg-gray-800/90 rounded-2xl p-6 border border-gray-700 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">💳</span>
                <h1 className="text-2xl font-black text-white tracking-tight">Transaction Dispatcher</h1>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Choose a pre-configured transaction to test real-time AI classification, SHAP & LIME rules, and banker alerts.
              </p>
            </div>

            {/* Quick Demo Trigger Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={sendRandomNormal}
                disabled={loading || transactions.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                <span>🟢</span>
                <span>Send Random Normal</span>
              </button>
              <button
                onClick={sendRandomFraud}
                disabled={loading || transactions.length === 0}
                className="bg-red-600 hover:bg-red-500 disabled:bg-gray-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-red-950/40"
              >
                <span>🚨</span>
                <span>Send Random Fraud</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 border-t border-gray-700/80 pt-4 flex-wrap">
            <span className="text-xs text-gray-400 font-semibold mr-2">Filter Catalog:</span>
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                filterType === 'all' ? 'bg-blue-600 text-white shadow' : 'bg-gray-900 text-gray-400 hover:text-white'
              }`}
            >
              <span>All Samples</span>
              <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full">{counts.all}</span>
            </button>
            <button
              onClick={() => setFilterType('normal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                filterType === 'normal' ? 'bg-emerald-600 text-white shadow' : 'bg-gray-900 text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <span>🟢 Normal Profiles</span>
              <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full font-black">{counts.normal}</span>
            </button>
            <button
              onClick={() => setFilterType('fraud')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                filterType === 'fraud' ? 'bg-red-600 text-white shadow' : 'bg-gray-900 text-red-400 hover:text-red-300'
              }`}
            >
              <span>🚨 Fraud Profiles</span>
              <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full font-black">{counts.fraud}</span>
            </button>
          </div>
        </div>

        {/* Transactions Grid */}
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            <div className="text-3xl mb-2 animate-spin">⚙️</div>
            Loading sample transactions…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredTransactions.map((tx) => (
              <TransactionCard
                key={tx.id}
                tx={tx}
                onSend={sendTransaction}
                sending={sendingId === tx.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right Sidebar: Recently Sent Transactions */}
      <div className="w-full lg:w-80 shrink-0 space-y-4">
        <div className="bg-gray-800/90 rounded-2xl p-5 border border-gray-700 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-gray-700 pb-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <span>⏱️</span> Recently Dispatched
            </h2>
            <span className="text-[11px] font-mono text-gray-400">{recentlySent.length}</span>
          </div>

          {recentlySent.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center italic">
              No transactions sent yet. Click any card to submit.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {recentlySent.map((tx, idx) => (
                <div
                  key={tx.id || idx}
                  className="bg-gray-900/80 p-3 rounded-xl border border-gray-800 space-y-1.5 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white text-xs truncate">{tx.merchant}</span>
                    <span className="text-amber-300 font-black text-xs shrink-0">{formatINR(tx.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>····{tx.card_last4}</span>
                    <span>{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        tx.expected_type === 'fraud'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {tx.expected_type === 'fraud' ? '🚨 Fraud Test' : '🟢 Normal Test'}
                    </span>
                    <span className="text-[10px] text-gray-500 ml-auto">Dispatched</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {recentlySent.length > 0 && (
            <button
              onClick={() => setRecentlySent([])}
              className="w-full text-center text-[11px] text-gray-500 hover:text-gray-300 transition-colors pt-2 border-t border-gray-750"
            >
              Clear Recent History
            </button>
          )}
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
