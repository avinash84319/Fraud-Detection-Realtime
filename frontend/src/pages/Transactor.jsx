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

export function detectProfile(tx) {
  if (tx.expected_type === 'fraud' || tx.expected_type === 'normal') {
    return tx.expected_type
  }
  const fraudMerchants = [
    'marriott',
    'dünyası',
    'dunyasi',
    'crypto',
    'goldbazaar',
    'fx trading',
    'luxwatch',
    'casino',
    'rolex',
    'gucci',
    'atm cash',
  ]
  const m = (tx.merchant || '').toLowerCase()
  if (fraudMerchants.some((f) => m.includes(f))) return 'fraud'
  if (['gambling', 'luxury', 'financial_services'].includes(tx.category?.toLowerCase())) return 'fraud'
  if (tx.amount >= 2000 && (tx.country !== 'US' || (tx.hour_of_day !== undefined && (tx.hour_of_day < 6 || tx.hour_of_day >= 22)))) {
    return 'fraud'
  }
  return 'normal'
}

const STATIC_SAMPLE_TRANSACTIONS = [
  {
    id: 'sample-01',
    amount: 42.5,
    merchant: 'Amazon',
    category: 'online_retail',
    card_last4: '4521',
    location: 'US',
    city: 'Seattle',
    country: 'US',
    user_id: 'user_001',
    hour_of_day: 9,
    day_of_week: 4,
    is_weekend: 0,
    expected_type: 'normal',
    expected_label: 'Normal Profile',
    risk_indicator: 'Tier-1 Retail, Daytime 09:23 AM',
  },
  {
    id: 'sample-02',
    amount: 55.0,
    merchant: 'Shell Gas',
    category: 'gas_station',
    card_last4: '7832',
    location: 'US',
    city: 'Houston',
    country: 'US',
    user_id: 'user_002',
    hour_of_day: 11,
    day_of_week: 4,
    is_weekend: 0,
    expected_type: 'normal',
    expected_label: 'Normal Profile',
    risk_indicator: 'Routine Fuel Spend, Daytime 11:05 AM',
  },
  {
    id: 'sample-03',
    amount: 123.75,
    merchant: 'Walmart',
    category: 'grocery',
    card_last4: '9910',
    location: 'US',
    city: 'Dallas',
    country: 'US',
    user_id: 'user_003',
    hour_of_day: 14,
    day_of_week: 5,
    is_weekend: 1,
    expected_type: 'normal',
    expected_label: 'Normal Profile',
    risk_indicator: 'Weekend Groceries, Domestic US',
  },
  {
    id: 'sample-04',
    amount: 4999.99,
    merchant: 'Marriott Hotels',
    category: 'travel',
    card_last4: '3301',
    location: 'AE',
    city: 'Dubai',
    country: 'AE',
    user_id: 'user_001',
    hour_of_day: 22,
    day_of_week: 6,
    is_weekend: 1,
    expected_type: 'fraud',
    expected_label: 'Fraud Profile',
    risk_indicator: 'High Amount, Foreign UAE Terminal at 22:47',
  },
  {
    id: 'sample-05',
    amount: 2800.0,
    merchant: 'Elektronik Dünyası',
    category: 'electronics',
    card_last4: '4521',
    location: 'TR',
    city: 'Istanbul',
    country: 'TR',
    user_id: 'user_001',
    hour_of_day: 3,
    day_of_week: 0,
    is_weekend: 0,
    expected_type: 'fraud',
    expected_label: 'Fraud Profile',
    risk_indicator: 'Foreign Cross-Border (TR), Nocturnal 03:12 AM',
  },
  {
    id: 'sample-06',
    amount: 15.99,
    merchant: 'Apple Store',
    category: 'digital_goods',
    card_last4: '6610',
    location: 'US',
    city: 'Cupertino',
    country: 'US',
    user_id: 'user_004',
    hour_of_day: 8,
    day_of_week: 0,
    is_weekend: 0,
    expected_type: 'normal',
    expected_label: 'Normal Profile',
    risk_indicator: 'Low-Ticket App Subscription, Morning',
  },
  {
    id: 'sample-07',
    amount: 310.0,
    merchant: 'Best Buy',
    category: 'electronics',
    card_last4: '2244',
    location: 'US',
    city: 'Minneapolis',
    country: 'US',
    user_id: 'user_005',
    hour_of_day: 13,
    day_of_week: 0,
    is_weekend: 0,
    expected_type: 'normal',
    expected_label: 'Normal Profile',
    risk_indicator: 'Standard Electronics Retail, Daytime',
  },
  {
    id: 'sample-08',
    amount: 9500.0,
    merchant: 'CryptoExchange Pro',
    category: 'financial_services',
    card_last4: '7832',
    location: 'NG',
    city: 'Lagos',
    country: 'NG',
    user_id: 'user_002',
    hour_of_day: 23,
    day_of_week: 0,
    is_weekend: 0,
    expected_type: 'fraud',
    expected_label: 'Fraud Profile',
    risk_indicator: 'High-Risk Crypto Cashout, Midnight 23:58',
  },
  {
    id: 'sample-09',
    amount: 8.99,
    merchant: 'Spotify',
    category: 'subscription',
    card_last4: '9910',
    location: 'US',
    city: 'New York',
    country: 'US',
    user_id: 'user_003',
    hour_of_day: 7,
    day_of_week: 1,
    is_weekend: 0,
    expected_type: 'normal',
    expected_label: 'Normal Profile',
    risk_indicator: 'Monthly Recurring Music Subscription',
  },
  {
    id: 'sample-10',
    amount: 237.5,
    merchant: 'Delta Airlines',
    category: 'travel',
    card_last4: '3301',
    location: 'US',
    city: 'Atlanta',
    country: 'US',
    user_id: 'user_006',
    hour_of_day: 12,
    day_of_week: 1,
    is_weekend: 0,
    expected_type: 'normal',
    expected_label: 'Normal Profile',
    risk_indicator: 'Standard Domestic Flight Booking, Midday',
  },
  {
    id: 'sample-11',
    amount: 75.25,
    merchant: 'Target',
    category: 'grocery',
    card_last4: '5588',
    location: 'US',
    city: 'Chicago',
    country: 'US',
    user_id: 'user_007',
    hour_of_day: 15,
    day_of_week: 1,
    is_weekend: 0,
    expected_type: 'normal',
    expected_label: 'Normal Profile',
    risk_indicator: 'Household Goods, Afternoon 15:00',
  },
  {
    id: 'sample-12',
    amount: 1500.0,
    merchant: 'GoldBazaar Online',
    category: 'luxury',
    card_last4: '6610',
    location: 'IN',
    city: 'Mumbai',
    country: 'IN',
    user_id: 'user_004',
    hour_of_day: 2,
    day_of_week: 1,
    is_weekend: 0,
    expected_type: 'fraud',
    expected_label: 'Fraud Profile',
    risk_indicator: 'Unnotified Offshore Luxury, 02:05 AM',
  },
  {
    id: 'sample-13',
    amount: 29.99,
    merchant: 'Netflix',
    category: 'subscription',
    card_last4: '2244',
    location: 'US',
    city: 'Los Angeles',
    country: 'US',
    user_id: 'user_005',
    hour_of_day: 10,
    day_of_week: 2,
    is_weekend: 0,
    expected_type: 'normal',
    expected_label: 'Normal Profile',
    risk_indicator: 'Verified Recurring Media Subscription',
  },
  {
    id: 'sample-14',
    amount: 450.0,
    merchant: 'Zara',
    category: 'clothing',
    card_last4: '7832',
    location: 'ES',
    city: 'Madrid',
    country: 'ES',
    user_id: 'user_002',
    hour_of_day: 16,
    day_of_week: 2,
    is_weekend: 0,
    expected_type: 'normal',
    expected_label: 'Normal Profile',
    risk_indicator: 'Retail Apparel, Afternoon 16:40',
  },
  {
    id: 'sample-15',
    amount: 7800.0,
    merchant: 'FX Trading Ltd',
    category: 'financial_services',
    card_last4: '9910',
    location: 'CY',
    city: 'Nicosia',
    country: 'CY',
    user_id: 'user_003',
    hour_of_day: 4,
    day_of_week: 2,
    is_weekend: 0,
    expected_type: 'fraud',
    expected_label: 'Fraud Profile',
    risk_indicator: 'Offshore Forex Liquidity Drain, 04:33 AM',
  },
  {
    id: 'sample-16',
    amount: 180.0,
    merchant: 'Costco',
    category: 'grocery',
    card_last4: '3301',
    location: 'US',
    city: 'Portland',
    country: 'US',
    user_id: 'user_006',
    hour_of_day: 9,
    day_of_week: 3,
    is_weekend: 0,
    expected_type: 'normal',
    expected_label: 'Normal Profile',
    risk_indicator: 'Domestic Wholesale Groceries, 09:00 AM',
  },
  {
    id: 'sample-17',
    amount: 95.0,
    merchant: 'Uber Eats',
    category: 'food_delivery',
    card_last4: '5588',
    location: 'US',
    city: 'San Francisco',
    country: 'US',
    user_id: 'user_007',
    hour_of_day: 20,
    day_of_week: 3,
    is_weekend: 0,
    expected_type: 'normal',
    expected_label: 'Normal Profile',
    risk_indicator: 'Evening Dinner Delivery, Domestic US',
  },
  {
    id: 'sample-18',
    amount: 3200.0,
    merchant: 'LuxWatch SG',
    category: 'luxury',
    card_last4: '6610',
    location: 'SG',
    city: 'Singapore',
    country: 'SG',
    user_id: 'user_004',
    hour_of_day: 1,
    day_of_week: 4,
    is_weekend: 0,
    expected_type: 'fraud',
    expected_label: 'Fraud Profile',
    risk_indicator: 'High-Value Foreign Luxury Watch, 01:50 AM',
  },
  {
    id: 'sample-19',
    amount: 62.0,
    merchant: 'CVS Pharmacy',
    category: 'pharmacy',
    card_last4: '2244',
    location: 'US',
    city: 'Boston',
    country: 'US',
    user_id: 'user_005',
    hour_of_day: 11,
    day_of_week: 4,
    is_weekend: 0,
    expected_type: 'normal',
    expected_label: 'Normal Profile',
    risk_indicator: 'Everyday Healthcare / Pharmacy',
  },
  {
    id: 'sample-20',
    amount: 12000.0,
    merchant: 'CasinoBet Online',
    category: 'gambling',
    card_last4: '7832',
    location: 'MT',
    city: 'Valletta',
    country: 'MT',
    user_id: 'user_002',
    hour_of_day: 23,
    day_of_week: 4,
    is_weekend: 0,
    expected_type: 'fraud',
    expected_label: 'Fraud Profile',
    risk_indicator: 'Offshore Casino Drain, Nocturnal 23:45 PM',
  },
]

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
  const profile = detectProfile(tx)
  const isFraud = profile === 'fraud'

  return (
    <div
      className={`rounded-2xl p-5 border-2 transition-all shadow-xl flex flex-col justify-between h-full space-y-4 ${
        isFraud
          ? 'bg-gradient-to-b from-red-950/30 via-gray-900 to-gray-900 border-red-500/80 shadow-red-950/30 hover:border-red-400 hover:shadow-red-900/50'
          : 'bg-gradient-to-b from-emerald-950/20 via-gray-900 to-gray-900 border-emerald-500/80 shadow-emerald-950/30 hover:border-emerald-400 hover:shadow-emerald-900/50'
      }`}
    >
      {/* Top Profile Banner - Prominent & Unmissable */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-700/60 pb-3">
        <div
          className={`text-xs font-black uppercase px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-md ${
            isFraud
              ? 'bg-red-600 text-white border border-red-400 ring-2 ring-red-500/30'
              : 'bg-emerald-600 text-white border border-emerald-400 ring-2 ring-emerald-500/30'
          }`}
        >
          <span className="text-sm">{isFraud ? '🚨' : '🟢'}</span>
          <span className="tracking-wide">{isFraud ? 'FRAUD PROFILE' : 'NORMAL PROFILE'}</span>
        </div>
        <span className="text-xs text-gray-400 font-mono font-semibold">····{tx.card_last4}</span>
      </div>

      {/* Complete Merchant & Amount Box */}
      <div
        className={`rounded-xl p-3.5 border flex items-center justify-between gap-3 shadow-inner ${
          isFraud
            ? 'bg-gray-950/90 border-red-900/40 border-l-4 border-l-red-500'
            : 'bg-gray-950/90 border-emerald-900/40 border-l-4 border-l-emerald-500'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-11 h-11 rounded-xl border flex items-center justify-center text-xl shrink-0 ${
              isFraud
                ? 'bg-red-950/60 border-red-800 text-red-200'
                : 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
            }`}
          >
            {categoryIcon(tx.category)}
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-white text-base truncate" title={tx.merchant}>
              {tx.merchant}
            </h3>
            <p className="text-[11px] text-gray-400 capitalize truncate font-medium">
              {tx.category?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {/* Amount Box */}
        <div className="text-right shrink-0 pl-2">
          <div className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Amount</div>
          <div
            className={`text-base font-black tracking-tight ${
              isFraud ? 'text-amber-300' : 'text-emerald-300'
            }`}
          >
            {formatINR(tx.amount)}
          </div>
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-gray-900/80 p-2 rounded-lg border border-gray-800 text-gray-300 flex items-center gap-1.5 truncate">
          <span>📍</span>
          <span className="truncate font-medium">{tx.city || tx.location}, {tx.country || 'US'}</span>
        </div>
        <div className="bg-gray-900/80 p-2 rounded-lg border border-gray-800 text-gray-300 flex items-center gap-1.5 truncate">
          <span>🕐</span>
          <span className="truncate font-medium">{tx.hour_of_day}:00 ({tx.is_weekend ? 'Weekend' : 'Weekday'})</span>
        </div>
      </div>

      {/* Profile Risk Explanation Tag */}
      <div
        className={`p-2.5 rounded-lg text-[11px] font-semibold leading-relaxed border ${
          isFraud
            ? 'bg-red-950/60 text-red-200 border-red-800/80'
            : 'bg-emerald-950/60 text-emerald-200 border-emerald-800/80'
        }`}
      >
        <span className="font-extrabold">{isFraud ? '⚠️ Risk Indicator: ' : '✅ Safe Pattern: '}</span>
        <span>{tx.risk_indicator || (isFraud ? 'Anomalous parameters match fraud signatures.' : 'Consistent with regular consumer spending.')}</span>
      </div>

      {/* Pinned Full-Width Action Button */}
      <button
        onClick={() => onSend(tx)}
        disabled={sending}
        className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
          isFraud
            ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white shadow-red-950/50 hover:shadow-red-800/60 active:scale-[0.98]'
            : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50 hover:shadow-emerald-800/60 active:scale-[0.98]'
        } disabled:bg-gray-700 disabled:cursor-not-allowed`}
      >
        {sending ? (
          <span>⏳ Dispatching Transaction…</span>
        ) : (
          <>
            <span className="text-sm">{isFraud ? '⚡' : '🚀'}</span>
            <span>{isFraud ? 'Run as FRAUD Transaction' : 'Run as NORMAL Transaction'}</span>
          </>
        )}
      </button>
    </div>
  )
}

export default function Transactor() {
  const [transactions, setTransactions] = useState(STATIC_SAMPLE_TRANSACTIONS)
  const [loading, setLoading] = useState(false)
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

  // Load from API with fallback to static dataset
  useEffect(() => {
    fetch('/api/sample-transactions')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const enriched = data.map((t) => ({
            ...t,
            expected_type: detectProfile(t),
            expected_label: detectProfile(t) === 'fraud' ? 'Fraud Profile' : 'Normal Profile',
          }))
          setTransactions(enriched)
        }
      })
      .catch((err) => {
        console.warn('Using static fallback transactions:', err)
      })
  }, [])

  // Persist recentlySent in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('fraudguard_recently_sent', JSON.stringify(recentlySent))
    } catch {}
  }, [recentlySent])

  async function sendTransaction(rawTx) {
    const profile = detectProfile(rawTx)
    const isFraud = profile === 'fraud'
    const now = new Date()

    // Preserve the characteristic hour for fraud tests (night hours like 23, 2, 3) so model triggers reliably
    const tx = {
      ...rawTx,
      id: crypto.randomUUID(),
      timestamp: now.toISOString(),
      hour_of_day: rawTx.hour_of_day !== undefined ? rawTx.hour_of_day : isFraud ? 2 : 14,
      day_of_week: rawTx.day_of_week !== undefined ? rawTx.day_of_week : now.getDay(),
      is_weekend: rawTx.is_weekend !== undefined ? rawTx.is_weekend : [0, 6].includes(now.getDay()) ? 1 : 0,
      expected_type: isFraud ? 'fraud' : 'normal',
      expected_label: isFraud ? 'Fraud Profile' : 'Normal Profile',
    }

    setSendingId(rawTx.id)
    try {
      const res = await fetch('/api/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx),
      })
      if (res.ok) {
        setToast(`Dispatched ${isFraud ? '🚨 Fraud' : '🟢 Normal'}: ${tx.merchant} (${formatINR(tx.amount)})!`)
        setRecentlySent((prev) => [tx, ...prev.filter((item) => item.id !== tx.id)].slice(0, 15))
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
    const normals = transactions.filter((t) => detectProfile(t) === 'normal')
    if (normals.length === 0) return
    const pick = normals[Math.floor(Math.random() * normals.length)]
    sendTransaction(pick)
  }

  function sendRandomFraud() {
    const frauds = transactions.filter((t) => detectProfile(t) === 'fraud')
    if (frauds.length === 0) return
    const pick = frauds[Math.floor(Math.random() * frauds.length)]
    sendTransaction(pick)
  }

  const filteredTransactions = useMemo(() => {
    if (filterType === 'normal') return transactions.filter((t) => detectProfile(t) === 'normal')
    if (filterType === 'fraud') return transactions.filter((t) => detectProfile(t) === 'fraud')
    return transactions
  }, [transactions, filterType])

  const counts = useMemo(() => {
    const normalCount = transactions.filter((t) => detectProfile(t) === 'normal').length
    const fraudCount = transactions.filter((t) => detectProfile(t) === 'fraud').length
    return { all: transactions.length, normal: normalCount, fraud: fraudCount }
  }, [transactions])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8 flex-col lg:flex-row">
      {/* Main Cards Area */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header Hero Section */}
        <div className="bg-gray-800/95 rounded-2xl p-6 border border-gray-700 shadow-2xl space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">🛡️</span>
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tight">Transaction Dispatcher</h1>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Select pre-configured profiles below to test real-time AI classification, SHAP & LIME rules, and banker alerts.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated Side-by-Side Quick Test Launchers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Quick Normal Dispatch Card */}
            <div className="bg-emerald-950/30 border-2 border-emerald-500/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🟢</span>
                <div>
                  <h3 className="text-sm font-black text-emerald-300">Test Normal Transaction</h3>
                  <p className="text-[11px] text-emerald-200/80">Everyday retail purchase (e.g. Amazon, Walmart, Apple Store)</p>
                </div>
              </div>
              <button
                onClick={sendRandomNormal}
                disabled={loading || transactions.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white font-extrabold px-4 py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60"
              >
                <span>🚀</span>
                <span>Send Random NORMAL Transaction</span>
              </button>
            </div>

            {/* Quick Fraud Dispatch Card */}
            <div className="bg-red-950/30 border-2 border-red-500/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚨</span>
                <div>
                  <h3 className="text-sm font-black text-red-300">Test Fraud Transaction</h3>
                  <p className="text-[11px] text-red-200/80">High-risk anomaly (e.g. CasinoBet, CryptoExchange, Offshore FX)</p>
                </div>
              </div>
              <button
                onClick={sendRandomFraud}
                disabled={loading || transactions.length === 0}
                className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 text-white font-extrabold px-4 py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-950/60"
              >
                <span>⚡</span>
                <span>Send Random FRAUD Transaction</span>
              </button>
            </div>
          </div>

          {/* Filter Bar with Profile Counters */}
          <div className="flex items-center gap-2.5 border-t border-gray-700/80 pt-4 flex-wrap">
            <span className="text-xs text-gray-300 font-extrabold mr-1">Filter Profiles:</span>
            <button
              onClick={() => setFilterType('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              <span>All Catalog</span>
              <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-full font-mono">{counts.all}</span>
            </button>
            <button
              onClick={() => setFilterType('normal')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                filterType === 'normal'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 ring-2 ring-emerald-400'
                  : 'bg-gray-900 text-emerald-400 hover:text-emerald-300 border border-emerald-900/50'
              }`}
            >
              <span>🟢 Normal Profiles</span>
              <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-full font-mono font-black">{counts.normal}</span>
            </button>
            <button
              onClick={() => setFilterType('fraud')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                filterType === 'fraud'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/40 ring-2 ring-red-400'
                  : 'bg-gray-900 text-red-400 hover:text-red-300 border border-red-900/50'
              }`}
            >
              <span>🚨 Fraud Profiles</span>
              <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-full font-mono font-black">{counts.fraud}</span>
            </button>
          </div>
        </div>

        {/* Transactions Grid */}
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
      </div>

      {/* Right Sidebar: Recently Sent Transactions */}
      <div className="w-full lg:w-80 shrink-0 space-y-4">
        <div className="bg-gray-800/95 rounded-2xl p-5 border border-gray-700 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-gray-700 pb-3">
            <h2 className="font-extrabold text-white text-sm flex items-center gap-2">
              <span>⏱️</span> Recently Dispatched
            </h2>
            <span className="text-[11px] font-mono bg-gray-900 px-2 py-0.5 rounded text-gray-300 font-bold">
              {recentlySent.length}
            </span>
          </div>

          {recentlySent.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center italic">
              No transactions dispatched yet. Click any card or top trigger to test.
            </p>
          ) : (
            <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
              {recentlySent.map((tx, idx) => {
                const isFraud = detectProfile(tx) === 'fraud'
                return (
                  <div
                    key={tx.id || idx}
                    className={`p-3 rounded-xl border space-y-1.5 transition-colors ${
                      isFraud
                        ? 'bg-red-950/30 border-red-800/70'
                        : 'bg-emerald-950/20 border-emerald-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-white text-xs truncate">{tx.merchant}</span>
                      <span
                        className={`font-black text-xs shrink-0 ${
                          isFraud ? 'text-amber-300' : 'text-emerald-300'
                        }`}
                      >
                        {formatINR(tx.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span className="font-mono">····{tx.card_last4}</span>
                      <span>
                        {new Date(tx.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-800/60">
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isFraud
                            ? 'bg-red-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {isFraud ? '🚨 Fraud Test' : '🟢 Normal Test'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">Sent to Queue</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {recentlySent.length > 0 && (
            <button
              onClick={() => setRecentlySent([])}
              className="w-full text-center text-[11px] text-gray-400 hover:text-white transition-colors pt-2 border-t border-gray-700 font-semibold"
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
