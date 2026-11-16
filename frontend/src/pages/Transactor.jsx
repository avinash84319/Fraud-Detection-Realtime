import { useState, useEffect } from 'react'

const CATEGORY_ICONS = {
  grocery: '🛒',
  hotel: '🏨',
  travel: '✈️',
  pharmacy: '💊',
  food: '🍔',
  gas: '⛽',
  electronics: '💻',
  clothing: '👗',
  entertainment: '🎭',
  online: '🌐',
  finance: '💰',
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

function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
      <span>✅</span>
      <span className="font-semibold">{message}</span>
    </div>
  )
}

function TransactionCard({ tx, onSend, sending }) {
  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-4 flex flex-col gap-3 border border-gray-700 hover:border-blue-500 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{categoryIcon(tx.category)}</span>
          <div>
            <div className="font-semibold text-white leading-tight">{tx.merchant}</div>
            <div className="text-xs text-gray-400 capitalize">{tx.category}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-blue-300">{formatUSD(tx.amount)}</div>
          <div className="text-xs text-gray-500">····{tx.card_last4}</div>
        </div>
      </div>
      <div className="text-xs text-gray-400 flex items-center gap-1">
        <span>📍</span>
        <span>{tx.city || tx.location}, {tx.country || ''}</span>
      </div>
      <div className="text-xs text-gray-500">
        🕐 {tx.hour_of_day !== undefined ? `${tx.hour_of_day}:00` : ''}{' '}
        {tx.is_weekend ? '(Weekend)' : '(Weekday)'}
      </div>
      <button
        onClick={() => onSend(tx)}
        disabled={sending}
        className="mt-auto w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition-colors text-sm"
      >
        {sending ? '⏳ Sending…' : '🚀 Send Transaction'}
      </button>
    </div>
  )
}

export default function Transactor() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [sendingId, setSendingId] = useState(null)
  const [recentlySent, setRecentlySent] = useState([])

  useEffect(() => {
    fetch('/api/sample-transactions')
      .then((r) => r.json())
      .then((data) => {
        setTransactions(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

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
        setToast(`Submitted ${tx.merchant} ($${tx.amount.toFixed(2)})!`)
        setRecentlySent((prev) => [tx, ...prev].slice(0, 8))
      } else {
        setToast('Error submitting transaction')
      }
    } catch {
      setToast('Network error – is the backend running?')
    } finally {
      setSendingId(null)
    }
  }

  function sendRandom() {
    if (transactions.length === 0) return
    const tx = transactions[Math.floor(Math.random() * transactions.length)]
    sendTransaction(tx)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
      {/* Main area */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">💳 Transaction Sender</h1>
            <p className="text-gray-400 text-sm mt-1">Select a pre-built transaction to send for demo</p>
          </div>
          <button
            onClick={sendRandom}
            disabled={loading || transactions.length === 0}
            className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white font-semibold px-5 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            🎲 Send Random
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-4 animate-spin">⚙️</div>
            <p>Loading transactions…</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-4">📭</div>
            <p>No sample transactions available. Is the backend running?</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {transactions.map((tx) => (
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

      {/* Sidebar */}
      <div className="w-64 shrink-0">
        <div className="bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-700 sticky top-20">
          <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <span>🕐</span> Recently Sent
          </h2>
          {recentlySent.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No transactions sent yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentlySent.map((tx, i) => (
                <li key={i} className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{categoryIcon(tx.category)}</span>
                    <span className="text-sm font-medium text-white truncate">{tx.merchant}</span>
                  </div>
                  <div className="text-blue-300 font-bold text-sm">{formatUSD(tx.amount)}</div>
                  <div className="text-xs text-gray-400">····{tx.card_last4}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
