import React, { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Dune Query IDs
const QUERIES = {
  USUAL_PRICE: 4404407,
  TVL_BY_PRODUCT: 5240771,
  USUAL_SUPPLY: 4409366,
  USUAL_STAKED: 4532780,
  COLLATERAL: 3886520,
  APYS: 5240973,
  USUALX_APY: 4451080,
  BUYBACKS: 5550653,
  USER_COUNT: 3852497,
  WALLET_DISTRIBUTION: 3888147,
  LOCKUP_DURATION: 5469491,
  COLLATERAL_BREAKDOWN: 4628405,
}

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4']

const formatUSD = (value: number): string => {
  if (value >= 1_000_000_000) return '$' + (value / 1_000_000_000).toFixed(2) + 'B'
  if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(2) + 'M'
  if (value >= 1_000) return '$' + (value / 1_000).toFixed(1) + 'K'
  return '$' + value.toFixed(2)
}

const formatNumber = (value: number): string => {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + 'B'
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M'
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K'
  return value.toFixed(0)
}

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const injectCSS = () => {
  if (typeof document === 'undefined' || document.getElementById('usual-css')) return
  const s = document.createElement('style')
  s.id = 'usual-css'
  s.textContent = `@keyframes usual-spin { to { transform: rotate(360deg); } }`
  document.head.appendChild(s)
}

export function UsualDashboard() {
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [priceData, setPriceData] = useState<any[]>([])
  const [tvlData, setTvlData] = useState<any[]>([])
  const [supplyData, setSupplyData] = useState<any>(null)
  const [stakingData, setStakingData] = useState<any>(null)
  const [collateralData, setCollateralData] = useState<any>(null)
  const [currentStats, setCurrentStats] = useState<any>(null)
  const [apyData, setApyData] = useState<any>(null)
  const [usualxApy, setUsualxApy] = useState<any>(null)
  const [buybacks, setBuybacks] = useState<any>(null)
  const [userCount, setUserCount] = useState<any>(null)
  const [walletDistribution, setWalletDistribution] = useState<any[]>([])
  const [lockupDuration, setLockupDuration] = useState<any[]>([])
  const [collateralBreakdown, setCollateralBreakdown] = useState<any[]>([])

  useEffect(() => {
    injectCSS()
    const k = localStorage.getItem('DUNE_API_KEY')
    if (k) setApiKey(k)
  }, [])

  const promptApiKey = () => {
    const k = prompt('Dune API key:', apiKey)
    if (k !== null) {
      const t = k.trim()
      if (t) { localStorage.setItem('DUNE_API_KEY', t); setApiKey(t); setError(null) }
      else { localStorage.removeItem('DUNE_API_KEY'); setApiKey('') }
    }
  }

  const fetchDuneQuery = async (queryId: number): Promise<any[]> => {
    const res = await fetch(`https://api.dune.com/api/v1/query/${queryId}/results`, {
      headers: { 'X-Dune-API-Key': apiKey }
    })
    if (!res.ok) throw new Error(`Query ${queryId} failed`)
    const data = await res.json()
    return data.result?.rows || []
  }

  const fetchAllData = async () => {
    if (!apiKey || loading) return
    setLoading(true)
    setError(null)

    try {
      const results = await Promise.all([
        fetchDuneQuery(QUERIES.USUAL_PRICE),
        fetchDuneQuery(QUERIES.TVL_BY_PRODUCT),
        fetchDuneQuery(QUERIES.USUAL_SUPPLY),
        fetchDuneQuery(QUERIES.USUAL_STAKED),
        fetchDuneQuery(QUERIES.COLLATERAL),
        fetchDuneQuery(QUERIES.APYS),
        fetchDuneQuery(QUERIES.USUALX_APY),
        fetchDuneQuery(QUERIES.BUYBACKS),
        fetchDuneQuery(QUERIES.USER_COUNT),
        fetchDuneQuery(QUERIES.WALLET_DISTRIBUTION),
        fetchDuneQuery(QUERIES.LOCKUP_DURATION),
        fetchDuneQuery(QUERIES.COLLATERAL_BREAKDOWN),
      ])

      const [price, tvl, supply, staked, collateral, apys, usualxApyData, buybackData, users, wallets, lockups, collBreakdown] = results

      setPriceData(price.slice(0, 60).reverse().map((r: any) => ({ date: formatDate(r.date), price: r.close_price })))
      setTvlData(tvl.slice(0, 60).reverse().map((r: any) => ({ date: formatDate(r.date), total: r.protocol_tvl })))

      if (supply[0]) setSupplyData({ price: supply[0].close_price, fdv: supply[0].fdv, marketCap: supply[0].market_cap, supply: supply[0].supply })
      if (staked[0]) setStakingData({ stakedPercent: staked[0]._col0, usualxSupply: staked[0].usualx_supply })
      if (collateral[0]) setCollateralData({ ratio: collateral[0].collateral_factor, supply: collateral[0].supply, total: collateral[0].balance_usd })
      if (tvl[0]) setCurrentStats({ tvl: tvl[0].protocol_tvl, usd0: tvl[0].usd0_tvl, eth0: tvl[0].eth0_tvl, eur0: tvl[0].eur0_tvl })
      if (apys[0]) setApyData({ usd0pp: apys[0].usd0_pp_apy, usd0Lp: apys[0].usd0_lp_apy, eth0: apys[0].eth0_apy, usd0ppLp: apys[0].usd0_pp_lp_apy })
      if (usualxApyData[0]) setUsualxApy({ apy: usualxApyData[0].usualx_apy_pct, apr: usualxApyData[0].usualx_apr_pct })
      if (buybackData[0]) setBuybacks({ total: buybackData[0].buyback, usualx: buybackData[0].buybackx })
      if (users[0]) setUserCount({ total: users[0].unique_addresses, delta: users[0].delta })

      setWalletDistribution(wallets.filter((w: any) => w.token === 'USD0').map((w: any) => ({
        name: w.tranche,
        value: w.portefeuille_count,
        percent: (w.pourcentage * 100).toFixed(2)
      })))

      setLockupDuration(lockups.map((l: any) => ({ name: l.bucket, value: l.nb_tokens })))
      setCollateralBreakdown(collBreakdown.filter((c: any) => c.value > 0).map((c: any) => ({ name: c.collateral, value: c.value })))

    } catch (e: any) {
      setError(e.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (apiKey && !priceData.length) fetchAllData() }, [apiKey])

  const card = { background: 'var(--vocs-color-background2)', border: '1px solid var(--vocs-color-border)', borderRadius: '12px', padding: '20px' }
  const label = { fontSize: '12px', color: 'var(--vocs-color-text2)', marginBottom: '4px' }
  const value = { fontSize: '24px', fontWeight: 700 as const }
  const smallValue = { fontSize: '16px', fontWeight: 600 as const }
  const sectionTitle = { fontSize: '18px', fontWeight: 600 as const, marginBottom: '16px' }

  if (!apiKey) {
    return (
      <div style={{ ...card, maxWidth: '400px', margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Usual Protocol Analytics</h2>
        <button onClick={promptApiKey} style={{ background: 'var(--vocs-color-text)', color: 'var(--vocs-color-background)', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          Enter Dune API Key
        </button>
      </div>
    )
  }

  if (loading && !priceData.length) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <div style={{ width: '28px', height: '28px', border: '3px solid var(--vocs-color-border)', borderTopColor: 'var(--vocs-color-text)', borderRadius: '50%', animation: 'usual-spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={label}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Usual Protocol</h1>
        <button onClick={fetchAllData} disabled={loading} style={{ background: 'var(--vocs-color-background2)', border: '1px solid var(--vocs-color-border)', color: 'var(--vocs-color-text)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <div style={{ ...card, background: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626', marginBottom: '20px', padding: '12px 16px', fontSize: '14px' }}>{error}</div>}

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={card}>
          <div style={label}>Protocol TVL</div>
          <div style={value}>{currentStats ? formatUSD(currentStats.tvl) : '—'}</div>
        </div>
        <div style={card}>
          <div style={label}>USD0 Supply</div>
          <div style={value}>{collateralData ? formatUSD(collateralData.supply) : '—'}</div>
        </div>
        <div style={card}>
          <div style={label}>USUAL Price</div>
          <div style={value}>{supplyData ? '$' + supplyData.price.toFixed(4) : '—'}</div>
        </div>
        <div style={card}>
          <div style={label}>Market Cap</div>
          <div style={value}>{supplyData ? formatUSD(supplyData.marketCap) : '—'}</div>
        </div>
        <div style={card}>
          <div style={label}>Holders</div>
          <div style={value}>{userCount ? formatNumber(userCount.total) : '—'}</div>
        </div>
      </div>

      {/* APYs Section */}
      <div style={{ ...card, marginBottom: '24px' }}>
        <div style={sectionTitle}>Current APYs</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          <div>
            <div style={label}>USUALx Staking</div>
            <div style={{ ...smallValue, color: '#10B981' }}>{usualxApy ? usualxApy.apy.toFixed(2) + '%' : '—'}</div>
          </div>
          <div>
            <div style={label}>USD0++ (bUSD0)</div>
            <div style={{ ...smallValue, color: '#3B82F6' }}>{apyData ? apyData.usd0pp.toFixed(2) + '%' : '—'}</div>
          </div>
          <div>
            <div style={label}>USD0/USDC LP</div>
            <div style={{ ...smallValue, color: '#8B5CF6' }}>{apyData ? apyData.usd0Lp.toFixed(2) + '%' : '—'}</div>
          </div>
          <div>
            <div style={label}>bUSD0/USD0 LP</div>
            <div style={{ ...smallValue, color: '#F59E0B' }}>{apyData ? apyData.usd0ppLp.toFixed(2) + '%' : '—'}</div>
          </div>
          <div>
            <div style={label}>ETH0</div>
            <div style={{ ...smallValue, color: '#EC4899' }}>{apyData ? apyData.eth0.toFixed(2) + '%' : '—'}</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={card}>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>USUAL Price</div>
          <div style={{ height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceData}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => '$' + v.toFixed(2)} domain={['auto', 'auto']} width={40} />
                <Tooltip contentStyle={{ background: 'var(--vocs-color-background)', border: '1px solid var(--vocs-color-border)', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => ['$' + v.toFixed(4), 'Price']} />
                <Area type="monotone" dataKey="price" stroke="#3B82F6" fill="url(#priceGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Protocol TVL</div>
          <div style={{ height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tvlData}>
                <defs>
                  <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={formatUSD} domain={['auto', 'auto']} width={50} />
                <Tooltip contentStyle={{ background: 'var(--vocs-color-background)', border: '1px solid var(--vocs-color-border)', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => [formatUSD(v), 'TVL']} />
                <Area type="monotone" dataKey="total" stroke="#10B981" fill="url(#tvlGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* USUAL Token Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Staking */}
        <div style={card}>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>USUAL Staking</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#10B981' }}>{stakingData ? stakingData.stakedPercent.toFixed(0) + '%' : '—'}</div>
            <div style={{ flex: 1, height: '12px', background: 'var(--vocs-color-border)', borderRadius: '6px', overflow: 'hidden', position: 'relative' as const }}>
              <div style={{ height: '100%', width: `${stakingData?.stakedPercent || 0}%`, background: '#10B981', borderRadius: '6px' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={label}>USUALx Supply</div>
              <div style={smallValue}>{stakingData ? formatNumber(stakingData.usualxSupply) : '—'}</div>
            </div>
            <div>
              <div style={label}>FDV</div>
              <div style={smallValue}>{supplyData ? formatUSD(supplyData.fdv) : '—'}</div>
            </div>
          </div>
        </div>

        {/* Buybacks */}
        <div style={card}>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>USUAL Buybacks</div>
          <div>
            <div style={label}>Total Bought Back</div>
            <div style={{ ...value, color: '#8B5CF6', marginBottom: '12px' }}>{buybacks ? formatNumber(buybacks.total) : '—'}</div>
          </div>
          <div>
            <div style={label}>USUALx Buybacks</div>
            <div style={smallValue}>{buybacks ? formatNumber(buybacks.usualx) : '—'}</div>
          </div>
        </div>

        {/* Lock Duration */}
        <div style={card}>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>USUALx Lock Duration</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lockupDuration.sort((a, b) => b.value - a.value).map((item, i) => (
              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px' }}>{item.name}</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{formatNumber(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Collateral Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Collateral Ratio */}
        <div style={card}>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>USD0 Collateralization</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <div style={label}>Collateral Ratio</div>
              <div style={{ ...smallValue, color: collateralData?.ratio >= 100 ? '#10B981' : '#EF4444' }}>
                {collateralData ? collateralData.ratio.toFixed(2) + '%' : '—'}
              </div>
            </div>
            <div>
              <div style={label}>Total Collateral</div>
              <div style={smallValue}>{collateralData ? formatUSD(collateralData.total) : '—'}</div>
            </div>
            <div>
              <div style={label}>USD0 Supply</div>
              <div style={smallValue}>{collateralData ? formatUSD(collateralData.supply) : '—'}</div>
            </div>
          </div>
        </div>

        {/* Collateral Breakdown */}
        <div style={card}>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Collateral Breakdown</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ width: '100px', height: '100px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={collateralBreakdown} cx="50%" cy="50%" innerRadius={25} outerRadius={45} dataKey="value" strokeWidth={0}>
                    {collateralBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
              {collateralBreakdown.sort((a, b) => b.value - a.value).slice(0, 5).map((item, i) => (
                <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLORS[i % COLORS.length] }} />
                    <span>{item.name}</span>
                  </div>
                  <span style={{ fontWeight: 600 }}>{formatUSD(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TVL by Product & Wallet Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* TVL by Product */}
        <div style={card}>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>TVL by Product</div>
          {currentStats && [
            { name: 'USD0', value: currentStats.usd0, color: '#3B82F6' },
            { name: 'ETH0', value: currentStats.eth0, color: '#8B5CF6' },
            { name: 'EUR0', value: currentStats.eur0, color: '#EC4899' },
          ].map((item) => {
            const percent = (item.value / currentStats.tvl) * 100
            return (
              <div key={item.name} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px' }}>{item.name}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{formatUSD(item.value)} ({percent.toFixed(1)}%)</span>
                </div>
                <div style={{ height: '10px', background: 'var(--vocs-color-border)', borderRadius: '5px', overflow: 'hidden', position: 'relative' as const }}>
                  <div style={{ height: '100%', width: `${percent}%`, background: item.color, borderRadius: '5px' }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Wallet Distribution */}
        <div style={card}>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>USD0 Holder Distribution</div>
          <div style={{ height: '140px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={walletDistribution.slice(0, 5)} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={70} />
                <Tooltip contentStyle={{ background: 'var(--vocs-color-background)', border: '1px solid var(--vocs-color-border)', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => [formatNumber(v) + ' wallets', 'Count']} />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ fontSize: '12px', color: 'var(--vocs-color-text3)', textAlign: 'center' }}>
        Data from <a href="https://dune.com/usual_team/usual" target="_blank" style={{ color: 'var(--vocs-color-link)' }}>Dune Analytics</a>
      </div>
    </div>
  )
}

export default UsualDashboard
