import React, { useState, useEffect } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

// Types
interface WalletConfig {
  address: string
  name: string
  emoji: string
}

interface TokenData {
  symbol: string
  name: string
  amount: number
  price: number
  usdValue: number
  logoUrl?: string
  type: 'wallet' | 'protocol'
  protocol?: string
}

interface ProtocolData {
  name: string
  value: number
}

interface WalletData extends WalletConfig {
  totalBalance: number
  tokens: any[]
  protocols: any[]
  isStatic?: boolean
}

interface StrategyData {
  total: number
  items: { name: string; value: number }[]
}

// Configuration
const WALLETS: WalletConfig[] = [
  { address: '0xF3D913De4B23ddB9CfdFAF955BAC5634CbAE95F4', name: 'DAO LT TREASURY', emoji: '👑' },
  { address: '0xc32e2a2F03d41768095e67b62C9c739f2C2Bc4aA', name: 'DAO HOT WALLET', emoji: '🔥' },
  { address: '0x81ad394C0Fa87e99Ca46E1aca093BEe020f203f4', name: 'DAO TREASURY', emoji: '🏦' },
  { address: '0xe3fd5a2ca538904a9e967cbd9e64518369e5a03f', name: 'DAO BUYBACK', emoji: '💎' },
  { address: '0xcbf85d44178c01765ab32af72d5e291dcd39a06b', name: 'DAO AIRDROP', emoji: '🎁' },
  { address: '0xc45224eb37730fDE22bA371c0e368452Db5305E7', name: 'DAO Revenue Share', emoji: '💰' },
  { address: '0xb00b3f7b9f43e9af0b7d1c50baddfc5eff72ccd7', name: 'Ender Deployer', emoji: '🔧' },
]

const STATIC_WALLETS = [
  {
    address: '0xdd82875f0840aad58a455a70b88eed9f59cec7c7',
    name: 'DAO COLLATERAL',
    emoji: '🔐',
    totalBalance: 2801733,
    tokens: [{ symbol: 'Overcollateralization', name: 'Protocol Collateral', amount: 1, price: 2801733, logo_url: null }],
    protocols: [],
    isStatic: true,
  },
]

// Filters
const BLACKLISTED_TOKENS = ['ETHG', 'AICC', 'TBA', 'TAIKO0', 'MALLY']
const PROTOCOL_RECEIPT_TOKENS = ['aHorRwaUSCC', 'aHorRwaUSDC', 'uUSCC++', 'usUSDS++', 'ustUSR++', 'uTAC++', 'uSYRUP++', 'eUSD0-4', 'eUSD0-6', 'U0R', 'Fira', 'MC_USD0', 'stETHETH0', 'USUAL_MV']
const SKIP_PROTOCOLS = ['Lido', 'Hashnote']
const ETH_EXPOSURE_SYMBOLS = new Set(['ETH', 'WETH', 'STETH', 'WSTETH', 'ETH0'])
const DIRECTIONAL_TOKENS = new Set(['ETH', 'WETH', 'ETH0', 'USUAL', 'USUALX', 'STETH', 'WSTETH'])
const DIRECTIONAL_PROTOCOLS = ['Arrakis']
const SEMI_LIQUID_PROTOCOLS = ['Fira', 'Aave']

// Colors
const COLORS = {
  green: '#10B981',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  orange: '#F59E0B',
  cyan: '#06B6D4',
  red: '#EF4444',
}

// Utilities
const formatUSD = (value: number): string => {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return sign + '$' + (abs / 1_000_000).toFixed(2) + 'M'
  if (abs >= 1_000) return sign + '$' + (abs / 1_000).toFixed(1) + 'K'
  return sign + '$' + abs.toFixed(0)
}

const formatNumber = (value: number): string => {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return (abs / 1_000_000).toFixed(2) + 'M'
  if (abs >= 1_000) return (abs / 1_000).toFixed(1) + 'K'
  return abs.toFixed(0)
}

const shortenAddress = (addr: string) => addr.slice(0, 6) + '...' + addr.slice(-4)
const isBlacklisted = (s: string) => s && BLACKLISTED_TOKENS.some(b => b.toLowerCase() === s.toLowerCase())
const isReceiptToken = (s: string) => s && PROTOCOL_RECEIPT_TOKENS.some(t => t.toLowerCase() === s.toLowerCase())

const getProtocolColor = (name: string): string => {
  const map: Record<string, string> = { wallet: '#3b82f6', euler: '#8b5cf6', fira: '#f59e0b', morpho: '#06b6d4', usual: '#ec4899', aave: '#a855f7', curve: '#f4364c', uniswap: '#ff007a', arrakis: '#fbbf24' }
  return map[name.toLowerCase().split(' ')[0]] || '#6B7280'
}

const getDisplayName = (s: string) => ({ MC_USD0: 'Morpho USD0', U0R: 'Fira', mc_usd0: 'Morpho USD0', u0r: 'Fira' }[s] || s)

// API
const fetchDeBank = async (endpoint: string, address: string, apiKey: string): Promise<any> => {
  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  if (isLocal) {
    const urls: Record<string, string> = {
      total_balance: `https://pro-openapi.debank.com/v1/user/total_balance?id=${address}`,
      all_token_list: `https://pro-openapi.debank.com/v1/user/all_token_list?id=${address}&is_all=true`,
      all_complex_protocol_list: `https://pro-openapi.debank.com/v1/user/all_complex_protocol_list?id=${address}`,
    }
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(urls[endpoint])}`, {
      headers: { 'x-cors-api-key': 'temp_' + Date.now(), AccessKey: apiKey },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }
  const res = await fetch(`/api/debank?endpoint=${endpoint}&address=${address}&apiKey=${encodeURIComponent(apiKey)}`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`)
  return res.json()
}

// Inject minimal CSS
const injectCSS = () => {
  if (typeof document === 'undefined' || document.getElementById('tdb-css')) return
  const s = document.createElement('style')
  s.id = 'tdb-css'
  s.textContent = `
    @keyframes tdb-spin { to { transform: rotate(360deg); } }
    .tdb-row:hover { background: var(--vocs-color-background) !important; }
  `
  document.head.appendChild(s)
}

export function TreasuryDashboard() {
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const [wallets, setWallets] = useState<WalletData[]>([])
  const [tokens, setTokens] = useState<TokenData[]>([])
  const [protocols, setProtocols] = useState<ProtocolData[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [defiValue, setDefiValue] = useState(0)
  const [ethExposure, setEthExposure] = useState(0)
  const [usualTotal, setUsualTotal] = useState({ amount: 0, value: 0 })
  const [tokenCount, setTokenCount] = useState(0)
  const [strategy, setStrategy] = useState<{ directional: StrategyData; semiLiquid: StrategyData; liquid: StrategyData } | null>(null)

  useEffect(() => {
    injectCSS()
    const k = localStorage.getItem('DEBANK_API_KEY')
    if (k) setApiKey(k)
  }, [])

  const promptApiKey = () => {
    const k = prompt('DeBank Pro API key:', apiKey)
    if (k !== null) {
      const t = k.trim()
      if (t) { localStorage.setItem('DEBANK_API_KEY', t); setApiKey(t); setError(null) }
      else { localStorage.removeItem('DEBANK_API_KEY'); setApiKey('') }
    }
  }

  const fetchAll = async () => {
    if (!apiKey || loading) return
    setLoading(true)
    setError(null)
    setProgress(0)

    try {
      const wData: WalletData[] = []
      const tMap = new Map<string, TokenData>()
      const pMap = new Map<string, number>()
      const uniqueT = new Set<string>()
      let dVal = 0, ethExp = 0, uAmt = 0, uVal = 0

      for (let i = 0; i < WALLETS.length; i++) {
        const w = WALLETS[i]
        setProgress(Math.round(((i + 1) / WALLETS.length) * 100))
        try {
          const [bal, toks, protos] = await Promise.all([
            fetchDeBank('total_balance', w.address, apiKey),
            fetchDeBank('all_token_list', w.address, apiKey),
            fetchDeBank('all_complex_protocol_list', w.address, apiKey),
          ])
          wData.push({ ...w, totalBalance: bal.total_usd_value || 0, tokens: toks || [], protocols: protos || [] })

          ;(toks || []).forEach((t: any) => {
            if (isBlacklisted(t.symbol) || isReceiptToken(t.symbol) || t.amount <= 0 || t.price <= 0) return
            const usd = t.amount * t.price
            const dn = getDisplayName(t.symbol || t.id)
            uniqueT.add(dn)
            if (tMap.has(dn)) { const e = tMap.get(dn)!; e.amount += t.amount; e.usdValue += usd }
            else tMap.set(dn, { symbol: dn, name: t.name || dn, amount: t.amount, price: t.price, usdValue: usd, logoUrl: t.logo_url, type: 'wallet' })
            const sym = (t.symbol || '').toUpperCase()
            if (sym === 'USUAL' || sym === 'USUALX') { uAmt += t.amount; uVal += usd }
            if (ETH_EXPOSURE_SYMBOLS.has(sym)) ethExp += usd
          })

          ;(protos || []).forEach((p: any) => {
            const pn = p.name || 'Unknown'
            if (SKIP_PROTOCOLS.some(x => pn.toLowerCase().includes(x.toLowerCase()))) return
            ;(p.portfolio_item_list || []).forEach((it: any) => {
              const nv = it.stats?.net_usd_value || 0
              if (nv > 0) {
                dVal += nv
                pMap.set(pn, (pMap.get(pn) || 0) + nv)
                const k = `${pn}: ${it.name || pn}`
                if (tMap.has(k)) tMap.get(k)!.usdValue += nv
                else tMap.set(k, { symbol: it.name || pn, name: `${pn}`, amount: 1, price: nv, usdValue: nv, logoUrl: p.logo_url, type: 'protocol', protocol: pn })
                ;(it.detail?.supply_token_list || []).forEach((x: any) => { if (ETH_EXPOSURE_SYMBOLS.has((x.symbol || '').toUpperCase())) ethExp += (x.amount || 0) * (x.price || 0) })
                ;(it.detail?.borrow_token_list || []).forEach((x: any) => { if (ETH_EXPOSURE_SYMBOLS.has((x.symbol || '').toUpperCase())) ethExp -= (x.amount || 0) * (x.price || 0) })
              }
            })
          })
          await new Promise(r => setTimeout(r, 150))
        } catch (e) { console.error(`Error ${w.name}:`, e) }
      }

      STATIC_WALLETS.forEach(sw => { wData.push(sw as WalletData); uniqueT.add('Overcollat') })
      const tot = wData.reduce((s, w) => s + w.totalBalance, 0)

      // Strategy classification
      const dir: StrategyData = { total: 0, items: [] }
      const semi: StrategyData = { total: 0, items: [] }
      const liq: StrategyData = { total: 0, items: [] }
      wData.forEach(w => {
        if (w.isStatic) { semi.total += w.totalBalance; semi.items.push({ name: 'Overcollat', value: w.totalBalance }); return }
        ;(w.tokens || []).forEach((t: any) => {
          if (isBlacklisted(t.symbol) || isReceiptToken(t.symbol) || t.amount <= 0 || t.price <= 0) return
          const v = t.amount * t.price, sym = (t.symbol || '').toUpperCase(), dn = getDisplayName(t.symbol)
          const target = DIRECTIONAL_TOKENS.has(sym) ? dir : liq
          target.total += v
          const ex = target.items.find(i => i.name === dn)
          if (ex) ex.value += v; else target.items.push({ name: dn, value: v })
        })
        ;(w.protocols || []).forEach((p: any) => {
          const pn = p.name || ''
          if (SKIP_PROTOCOLS.some(x => pn.toLowerCase().includes(x.toLowerCase()))) return
          const pv = (p.portfolio_item_list || []).reduce((s: number, it: any) => s + (it.stats?.net_usd_value || 0), 0)
          if (pv <= 0) return
          const target = DIRECTIONAL_PROTOCOLS.some(x => pn.toLowerCase().includes(x.toLowerCase())) ? dir : SEMI_LIQUID_PROTOCOLS.some(x => pn.toLowerCase().includes(x.toLowerCase())) ? semi : liq
          target.total += pv
          target.items.push({ name: pn, value: pv })
        })
      })
      ;[dir, semi, liq].forEach(x => x.items.sort((a, b) => b.value - a.value))

      setWallets(wData)
      setTokens(Array.from(tMap.values()).sort((a, b) => b.usdValue - a.usdValue))
      setProtocols(Array.from(pMap.entries()).map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value))
      setTotalValue(tot)
      setDefiValue(dVal)
      setEthExposure(ethExp)
      setUsualTotal({ amount: uAmt, value: uVal })
      setTokenCount(uniqueT.size)
      setStrategy({ directional: dir, semiLiquid: semi, liquid: liq })
      setLastUpdate(new Date())
    } catch (e: any) { setError(e.message || 'Failed') }
    finally { setLoading(false); setProgress(0) }
  }

  useEffect(() => { if (apiKey && wallets.length === 0) fetchAll() }, [apiKey])

  // No API key
  if (!apiKey) {
    return (
      <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏦</div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>USUAL DAO Treasury</h1>
        <p style={{ color: 'var(--vocs-color-text2)', marginBottom: '20px', fontSize: '14px' }}>
          Requires a <a href="https://cloud.debank.com/" target="_blank" rel="noopener" style={{ color: COLORS.blue }}>DeBank Pro API key</a>
        </p>
        <button onClick={promptApiKey} style={{ background: COLORS.blue, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          Enter API Key
        </button>
      </div>
    )
  }

  // Loading
  if (loading && wallets.length === 0) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ width: '24px', height: '24px', border: '3px solid var(--vocs-color-border)', borderTopColor: COLORS.blue, borderRadius: '50%', animation: 'tdb-spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--vocs-color-text2)', marginBottom: '12px' }}>Loading wallets... {progress}%</p>
        <div style={{ background: 'var(--vocs-color-border)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: COLORS.blue, transition: 'width 0.2s' }} />
        </div>
      </div>
    )
  }

  const walletVal = totalValue - defiValue
  const pureVal = totalValue - usualTotal.value
  const chartData = strategy ? [
    { name: 'Directional', value: strategy.directional.total, color: COLORS.orange },
    { name: 'Semi-Liquid', value: strategy.semiLiquid.total, color: COLORS.purple },
    { name: 'Liquid', value: strategy.liquid.total, color: COLORS.green },
  ] : []

  return (
    <div style={{ padding: '16px', maxWidth: '1400px', margin: '0 auto', fontSize: '13px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🏦</span>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>USUAL DAO Treasury</h1>
            {lastUpdate && <span style={{ fontSize: '11px', color: 'var(--vocs-color-text3)' }}>Updated {lastUpdate.toLocaleTimeString()}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={promptApiKey} style={{ background: 'var(--vocs-color-background2)', border: '1px solid var(--vocs-color-border)', color: 'var(--vocs-color-text)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>🔑 API</button>
          <button onClick={fetchAll} disabled={loading} style={{ background: COLORS.blue, border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>🔄 Refresh</button>
        </div>
      </div>

      {error && <div style={{ background: `${COLORS.red}15`, border: `1px solid ${COLORS.red}30`, color: COLORS.red, padding: '10px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px' }}>⚠️ {error}</div>}

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Total Value', value: formatUSD(totalValue), color: COLORS.green },
          { label: 'Pure Treasury', value: formatUSD(pureVal), sub: 'excl. USUAL', color: COLORS.cyan },
          { label: 'ETH Exposure', value: formatUSD(ethExposure), sub: `${((ethExposure / totalValue) * 100).toFixed(1)}%`, color: COLORS.orange },
          { label: 'USUAL', value: formatNumber(usualTotal.amount), sub: formatUSD(usualTotal.value), color: COLORS.pink },
          { label: 'Tokens', value: String(tokenCount), color: COLORS.purple },
          { label: 'Top Protocol', value: protocols[0]?.name || '-', sub: protocols[0] ? formatUSD(protocols[0].value) : '', color: COLORS.blue },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--vocs-color-background2)', border: '1px solid var(--vocs-color-border)', borderRadius: '8px', padding: '12px', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '11px', color: 'var(--vocs-color-text2)', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: '10px', color: 'var(--vocs-color-text3)', marginTop: '2px' }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Strategy + Protocols */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        {/* Strategy */}
        <div style={{ background: 'var(--vocs-color-background2)', border: '1px solid var(--vocs-color-border)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontWeight: 600, marginBottom: '10px' }}>🎯 Strategy Allocation</div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ width: '120px', height: '120px', flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" strokeWidth={0}>
                    {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatUSD(v)} contentStyle={{ background: 'var(--vocs-color-background2)', border: '1px solid var(--vocs-color-border)', borderRadius: '4px', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {strategy && [
                { label: 'Directional', data: strategy.directional, color: COLORS.orange },
                { label: 'Semi-Liquid', data: strategy.semiLiquid, color: COLORS.purple },
                { label: 'Liquid', data: strategy.liquid, color: COLORS.green },
              ].map(({ label, data, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: color }} />
                    <span style={{ fontSize: '12px' }}>{label}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 600 }}>{formatUSD(data.total)}</span>
                    <span style={{ color: 'var(--vocs-color-text3)', marginLeft: '4px', fontSize: '11px' }}>({((data.total / totalValue) * 100).toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Protocols */}
        <div style={{ background: 'var(--vocs-color-background2)', border: '1px solid var(--vocs-color-border)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontWeight: 600, marginBottom: '10px' }}>📊 Protocol Allocation</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[{ name: 'Wallet', value: walletVal }, ...protocols.slice(0, 5)].map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 500, color: getProtocolColor(p.name), minWidth: '60px' }}>{p.name}</span>
                <div style={{ flex: 1, background: 'var(--vocs-color-background)', borderRadius: '2px', height: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${(p.value / totalValue) * 100}%`, height: '100%', background: getProtocolColor(p.name), borderRadius: '2px' }} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '50px', textAlign: 'right' }}>{formatUSD(p.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wallets + Holdings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Wallets */}
        <div style={{ background: 'var(--vocs-color-background2)', border: '1px solid var(--vocs-color-border)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--vocs-color-border)', fontWeight: 600 }}>🏛️ Wallets</div>
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {wallets.sort((a, b) => b.totalBalance - a.totalBalance).map((w, i) => (
              <div key={w.address} className="tdb-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: i < wallets.length - 1 ? '1px solid var(--vocs-color-border)' : 'none', transition: 'background 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{w.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '12px' }}>{w.name}</div>
                    <a href={`https://debank.com/profile/${w.address}`} target="_blank" rel="noopener" style={{ fontSize: '10px', color: COLORS.blue, fontFamily: 'monospace' }}>{shortenAddress(w.address)}</a>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600 }}>{formatUSD(w.totalBalance)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--vocs-color-text3)' }}>{((w.totalBalance / totalValue) * 100).toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Holdings */}
        <div style={{ background: 'var(--vocs-color-background2)', border: '1px solid var(--vocs-color-border)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--vocs-color-border)', fontWeight: 600 }}>🪙 Top Holdings</div>
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {tokens.slice(0, 15).map((t, i) => (
              <div key={t.symbol + i} className="tdb-row" style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: i < 14 ? '1px solid var(--vocs-color-border)' : 'none', transition: 'background 0.15s' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', marginRight: '10px', background: t.logoUrl ? `url(${t.logoUrl}) center/cover` : (t.type === 'protocol' ? `${getProtocolColor(t.protocol || '')}20` : 'var(--vocs-color-background)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: t.type === 'protocol' ? getProtocolColor(t.protocol || '') : 'var(--vocs-color-text2)' }}>
                  {!t.logoUrl && (t.type === 'protocol' ? '📊' : t.symbol.slice(0, 2))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.symbol}</span>
                    <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', background: t.type === 'protocol' ? `${getProtocolColor(t.protocol || '')}20` : `${COLORS.blue}20`, color: t.type === 'protocol' ? getProtocolColor(t.protocol || '') : COLORS.blue }}>{t.type === 'protocol' ? 'DEFI' : 'WALLET'}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--vocs-color-text3)' }}>{t.type === 'protocol' ? t.protocol : `${formatNumber(t.amount)} @ $${t.price.toFixed(2)}`}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600 }}>{formatUSD(t.usdValue)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--vocs-color-text3)' }}>{((t.usdValue / totalValue) * 100).toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Holdings by Wallet */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ fontWeight: 600, marginBottom: '12px', fontSize: '14px' }}>💼 Detailed Holdings by Wallet</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {wallets.sort((a, b) => b.totalBalance - a.totalBalance).map((w) => {
            const wTokens = (w.tokens || [])
              .filter((t: any) => !isBlacklisted(t.symbol) && !isReceiptToken(t.symbol) && t.amount > 0 && t.price > 0)
              .map((t: any) => ({ symbol: getDisplayName(t.symbol), amount: t.amount, price: t.price, usd: t.amount * t.price, logo: t.logo_url }))
              .sort((a: any, b: any) => b.usd - a.usd)

            const wProtos = (w.protocols || [])
              .filter((p: any) => !SKIP_PROTOCOLS.some(x => (p.name || '').toLowerCase().includes(x.toLowerCase())))
              .map((p: any) => ({
                name: p.name,
                total: (p.portfolio_item_list || []).reduce((s: number, it: any) => s + (it.stats?.net_usd_value || 0), 0),
                positions: (p.portfolio_item_list || [])
                  .filter((it: any) => (it.stats?.net_usd_value || 0) > 0)
                  .map((it: any) => ({
                    name: it.name || p.name,
                    value: it.stats?.net_usd_value || 0,
                    supply: (it.detail?.supply_token_list || []).map((t: any) => ({ symbol: t.symbol, amount: t.amount })),
                    borrow: (it.detail?.borrow_token_list || []).map((t: any) => ({ symbol: t.symbol, amount: t.amount })),
                  }))
              }))
              .filter((p: any) => p.positions.length > 0)
              .sort((a: any, b: any) => b.total - a.total)

            const walletTokensValue = wTokens.reduce((s: number, t: any) => s + t.usd, 0)
            const defiValue = wProtos.reduce((s: number, p: any) => s + p.total, 0)

            return (
              <div key={w.address} style={{ background: 'var(--vocs-color-background2)', border: '1px solid var(--vocs-color-border)', borderRadius: '8px' }}>
                {/* Header */}
                <div style={{ padding: '10px 14px', background: 'var(--vocs-color-background)', borderBottom: '1px solid var(--vocs-color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{w.emoji}</span>
                    <span style={{ fontWeight: 600 }}>{w.name}</span>
                    <a href={`https://debank.com/profile/${w.address}`} target="_blank" rel="noopener" style={{ fontSize: '10px', color: COLORS.blue, fontFamily: 'monospace', opacity: 0.8 }}>{shortenAddress(w.address)}</a>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: COLORS.green }}>{formatUSD(w.totalBalance)}</span>
                    <span style={{ fontSize: '11px', color: 'var(--vocs-color-text3)', background: 'var(--vocs-color-background2)', padding: '2px 8px', borderRadius: '4px' }}>{((w.totalBalance / totalValue) * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Static wallet */}
                {w.isStatic ? (
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px' }}>🛡️</span>
                    <span style={{ fontSize: '12px' }}>Overcollateralization - Protocol backing</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 600, color: COLORS.green }}>{formatUSD(w.totalBalance)}</span>
                  </div>
                ) : (
                  <div style={{ padding: '12px 14px' }}>
                    {/* Tokens Table */}
                    {wTokens.length > 0 && (
                      <div style={{ marginBottom: wProtos.length > 0 ? '14px' : 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: COLORS.blue }}>💰 Tokens</span>
                          <span style={{ fontSize: '11px', fontWeight: 600 }}>{formatUSD(walletTokensValue)}</span>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--vocs-color-border)' }}>
                              <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 500, color: 'var(--vocs-color-text3)' }}>Token</th>
                              <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 500, color: 'var(--vocs-color-text3)' }}>Amount</th>
                              <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 500, color: 'var(--vocs-color-text3)' }}>Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {wTokens.slice(0, 6).map((t: any, i: number) => (
                              <tr key={i} style={{ borderBottom: i < Math.min(wTokens.length, 6) - 1 ? '1px solid var(--vocs-color-border)' : 'none' }}>
                                <td style={{ padding: '6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {t.logo ? <img src={t.logo} alt="" style={{ width: '14px', height: '14px', borderRadius: '3px' }} /> : <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'var(--vocs-color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>{t.symbol.slice(0,2)}</span>}
                                  <span style={{ fontWeight: 500 }}>{t.symbol}</span>
                                </td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: 'var(--vocs-color-text2)' }}>{formatNumber(t.amount)}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>{formatUSD(t.usd)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {wTokens.length > 6 && <div style={{ fontSize: '10px', color: 'var(--vocs-color-text3)', marginTop: '4px' }}>+ {wTokens.length - 6} more tokens</div>}
                      </div>
                    )}

                    {/* DeFi Positions */}
                    {wProtos.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: COLORS.purple }}>📊 DeFi Positions</span>
                          <span style={{ fontSize: '11px', fontWeight: 600 }}>{formatUSD(defiValue)}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {wProtos.slice(0, 4).map((p: any, pi: number) => (
                            <div key={pi} style={{ background: 'var(--vocs-color-background)', borderRadius: '6px', padding: '8px 10px', borderLeft: `3px solid ${getProtocolColor(p.name)}` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: getProtocolColor(p.name) }}>{p.name}</span>
                                <span style={{ fontSize: '11px', fontWeight: 600 }}>{formatUSD(p.total)}</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {p.positions.slice(0, 3).map((pos: any, posi: number) => (
                                  <div key={posi} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ color: 'var(--vocs-color-text2)' }}>{pos.name}</span>
                                      {pos.supply.length > 0 && pos.supply.slice(0, 2).map((s: any, si: number) => (
                                        <span key={si} style={{ background: `${COLORS.green}15`, color: COLORS.green, padding: '1px 5px', borderRadius: '3px', fontSize: '9px' }}>+{formatNumber(s.amount)} {s.symbol}</span>
                                      ))}
                                      {pos.borrow.length > 0 && pos.borrow.slice(0, 2).map((b: any, bi: number) => (
                                        <span key={bi} style={{ background: `${COLORS.red}15`, color: COLORS.red, padding: '1px 5px', borderRadius: '3px', fontSize: '9px' }}>-{formatNumber(b.amount)} {b.symbol}</span>
                                      ))}
                                    </div>
                                    <span style={{ fontWeight: 500, color: 'var(--vocs-color-text2)' }}>{formatUSD(pos.value)}</span>
                                  </div>
                                ))}
                              </div>
                              {p.positions.length > 3 && <div style={{ fontSize: '9px', color: 'var(--vocs-color-text3)', marginTop: '4px' }}>+ {p.positions.length - 3} more</div>}
                            </div>
                          ))}
                        </div>
                        {wProtos.length > 4 && <div style={{ fontSize: '10px', color: 'var(--vocs-color-text3)', marginTop: '6px' }}>+ {wProtos.length - 4} more protocols</div>}
                      </div>
                    )}

                    {/* Empty state */}
                    {wTokens.length === 0 && wProtos.length === 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--vocs-color-text3)', textAlign: 'center', padding: '10px' }}>No holdings found</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--vocs-color-text3)', display: 'flex', justifyContent: 'space-between' }}>
        <span>Data: DeBank Pro API • {WALLETS.length + STATIC_WALLETS.length} wallets</span>
        <span><a href="https://debank.com" target="_blank" rel="noopener" style={{ color: COLORS.blue }}>DeBank</a> • <a href="https://etherscan.io" target="_blank" rel="noopener" style={{ color: COLORS.blue }}>Etherscan</a></span>
      </div>
    </div>
  )
}

export default TreasuryDashboard
