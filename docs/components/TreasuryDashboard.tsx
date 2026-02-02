import React, { useState, useEffect } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

// Types
interface WalletConfig {
  address: string
  name: string
  icon: string
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
  { address: '0xF3D913De4B23ddB9CfdFAF955BAC5634CbAE95F4', name: 'DAO LT TREASURY', icon: 'purple', emoji: '👑' },
  { address: '0xc32e2a2F03d41768095e67b62C9c739f2C2Bc4aA', name: 'DAO HOT WALLET', icon: 'orange', emoji: '🔥' },
  { address: '0x81ad394C0Fa87e99Ca46E1aca093BEe020f203f4', name: 'DAO TREASURY', icon: 'blue', emoji: '🏦' },
  { address: '0xe3fd5a2ca538904a9e967cbd9e64518369e5a03f', name: 'DAO BUYBACK', icon: 'pink', emoji: '💎' },
  { address: '0xcbf85d44178c01765ab32af72d5e291dcd39a06b', name: 'DAO AIRDROP', icon: 'green', emoji: '🎁' },
  { address: '0xc45224eb37730fDE22bA371c0e368452Db5305E7', name: 'DAO Revenue Share', icon: 'purple', emoji: '💰' },
  { address: '0xb00b3f7b9f43e9af0b7d1c50baddfc5eff72ccd7', name: 'Ender Deployer', icon: 'gray', emoji: '🔧' },
]

const STATIC_WALLETS = [
  {
    address: '0xdd82875f0840aad58a455a70b88eed9f59cec7c7',
    name: 'DAO COLLATERAL',
    icon: 'cyan',
    emoji: '🔐',
    totalBalance: 2801733,
    tokens: [{ symbol: 'Overcollateralization', name: 'Protocol Collateral', amount: 1, price: 2801733, logo_url: null }],
    protocols: [],
    isStatic: true,
  },
]

const BUYBACK_ADDRESS = '0xe3fd5a2ca538904a9e967cbd9e64518369e5a03f'.toLowerCase()

// Blacklisted tokens
const BLACKLISTED_TOKENS = ['ETHG', 'AICC', 'TBA', 'TAIKO0', 'MALLY']
const PROTOCOL_RECEIPT_TOKENS = [
  'aHorRwaUSCC', 'aHorRwaUSDC', 'uUSCC++', 'usUSDS++', 'ustUSR++', 'uTAC++', 'uSYRUP++',
  'eUSD0-4', 'eUSD0-6', 'U0R', 'Fira', 'MC_USD0', 'stETHETH0', 'USUAL_MV',
]
const SKIP_PROTOCOLS = ['Lido', 'Hashnote']
const ETH_EXPOSURE_SYMBOLS = new Set(['ETH', 'WETH', 'STETH', 'WSTETH', 'ETH0'])

// Strategy classification
const DIRECTIONAL_TOKENS = new Set(['ETH', 'WETH', 'ETH0', 'USUAL', 'USUALX', 'STETH', 'WSTETH'])
const DIRECTIONAL_PROTOCOLS = ['Arrakis']
const SEMI_LIQUID_PROTOCOLS = ['Fira', 'Aave']

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1600px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    marginBottom: '8px',
    color: 'var(--vocs-color-text)',
  },
  subtitle: {
    fontSize: '16px',
    color: 'var(--vocs-color-text2)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: 'var(--vocs-color-background2)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid var(--vocs-color-border)',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  statCardAccent: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
  },
  statLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--vocs-color-text2)',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--vocs-color-text)',
  },
  statSub: {
    fontSize: '12px',
    color: 'var(--vocs-color-text3)',
    marginTop: '6px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '16px',
    color: 'var(--vocs-color-text)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  card: {
    backgroundColor: 'var(--vocs-color-background2)',
    borderRadius: '16px',
    border: '1px solid var(--vocs-color-border)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '18px 20px',
    borderBottom: '1px solid var(--vocs-color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBody: {
    padding: '16px 20px',
  },
  protocolGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  protocolCard: {
    backgroundColor: 'var(--vocs-color-background2)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid var(--vocs-color-border)',
  },
  strategyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  strategyCard: {
    backgroundColor: 'var(--vocs-color-background2)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid var(--vocs-color-border)',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  walletRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
    borderBottom: '1px solid var(--vocs-color-border)',
  },
  tokenItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid var(--vocs-color-border)',
  },
  tokenIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    marginRight: '12px',
    backgroundColor: 'var(--vocs-color-background)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '12px',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  badge: {
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 600,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: 'var(--vocs-color-text2)',
  },
  apiKeyContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  apiKeyButton: {
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '12px',
  },
  refreshButton: {
    backgroundColor: 'var(--vocs-color-background)',
    border: '1px solid var(--vocs-color-border)',
    color: 'var(--vocs-color-text)',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: '8px',
  },
}

// Utility functions
const formatUSD = (value: number): string => {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return sign + '$' + (abs / 1_000_000).toFixed(2) + 'M'
  if (abs >= 1_000) return sign + '$' + (abs / 1_000).toFixed(1) + 'K'
  return sign + '$' + abs.toFixed(2)
}

const formatNumber = (value: number): string => {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(2) + 'M'
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(1) + 'K'
  return sign + abs.toFixed(2)
}

const shortenAddress = (address: string): string => {
  return address.slice(0, 6) + '...' + address.slice(-4)
}

const isBlacklisted = (symbol: string): boolean => {
  if (!symbol) return false
  return BLACKLISTED_TOKENS.some((b) => b.toLowerCase() === symbol.toLowerCase())
}

const isProtocolReceiptToken = (symbol: string): boolean => {
  if (!symbol) return false
  return PROTOCOL_RECEIPT_TOKENS.some((t) => t.toLowerCase() === symbol.toLowerCase())
}

const getProtocolColor = (name: string): string => {
  const colors: Record<string, string> = {
    wallet: '#3b82f6',
    euler: '#8b5cf6',
    fira: '#f59e0b',
    morpho: '#06b6d4',
    usual: '#ec4899',
    aave: '#a855f7',
    lido: '#00d4aa',
    curve: '#f4364c',
    uniswap: '#ff007a',
    arrakis: '#fbbf24',
    hashnote: '#60a5fa',
  }
  const key = name.toLowerCase().split(' ')[0]
  return colors[key] || '#8888a0'
}

const getDisplayName = (symbol: string): string => {
  const nameMap: Record<string, string> = {
    MC_USD0: 'Morpho MEV USD0',
    U0R: 'Fira',
    mc_usd0: 'Morpho MEV USD0',
    u0r: 'Fira',
    aHorRwaUSCC: 'Aave Horizon RWA USCC',
  }
  return nameMap[symbol] || symbol
}

// API functions
const fetchWithProxy = async (url: string, apiKey: string): Promise<any> => {
  const proxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`
  const response = await fetch(proxyUrl, {
    headers: {
      accept: 'application/json',
      AccessKey: apiKey,
    },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

const fetchTotalBalance = async (address: string, apiKey: string): Promise<any> => {
  return fetchWithProxy(`https://pro-openapi.debank.com/v1/user/total_balance?id=${address}`, apiKey)
}

const fetchTokenList = async (address: string, apiKey: string): Promise<any[]> => {
  return fetchWithProxy(`https://pro-openapi.debank.com/v1/user/all_token_list?id=${address}&is_all=true`, apiKey)
}

const fetchProtocolList = async (address: string, apiKey: string): Promise<any[]> => {
  return fetchWithProxy(`https://pro-openapi.debank.com/v1/user/all_complex_protocol_list?id=${address}`, apiKey)
}

// Components
const StatCard: React.FC<{
  label: string
  value: string
  sub?: string
  color?: string
}> = ({ label, value, sub, color = '#8b5cf6' }) => (
  <div style={styles.statCard}>
    <div style={{ ...styles.statCardAccent, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
    <div style={styles.statLabel}>{label}</div>
    <div style={styles.statValue}>{value}</div>
    {sub && <div style={styles.statSub}>{sub}</div>}
  </div>
)

const ProtocolBadge: React.FC<{ name: string }> = ({ name }) => {
  const color = getProtocolColor(name)
  return (
    <span
      style={{
        ...styles.badge,
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      {name}
    </span>
  )
}

export function TreasuryDashboard() {
  const [apiKey, setApiKey] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Data state
  const [walletData, setWalletData] = useState<WalletData[]>([])
  const [allTokens, setAllTokens] = useState<TokenData[]>([])
  const [allProtocols, setAllProtocols] = useState<ProtocolData[]>([])
  const [totalValue, setTotalValue] = useState<number>(0)
  const [totalDefiValue, setTotalDefiValue] = useState<number>(0)
  const [totalEthExposure, setTotalEthExposure] = useState<number>(0)
  const [usualTotal, setUsualTotal] = useState<{ amount: number; value: number }>({ amount: 0, value: 0 })
  const [uniqueTokenCount, setUniqueTokenCount] = useState<number>(0)
  const [strategyData, setStrategyData] = useState<{
    directional: StrategyData
    semiLiquid: StrategyData
    liquid: StrategyData
  } | null>(null)

  // Load API key from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('DEBANK_API_KEY')
    if (storedKey) {
      setApiKey(storedKey)
    }
  }, [])

  const handleSetApiKey = () => {
    const key = prompt('Enter your DeBank Pro API key:', apiKey)
    if (key !== null) {
      const trimmed = key.trim()
      if (trimmed) {
        localStorage.setItem('DEBANK_API_KEY', trimmed)
        setApiKey(trimmed)
        setError(null)
      } else {
        localStorage.removeItem('DEBANK_API_KEY')
        setApiKey('')
      }
    }
  }

  const fetchAllData = async () => {
    if (!apiKey || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const wallets: WalletData[] = []
      const tokensMap = new Map<string, TokenData>()
      const protocolsMap = new Map<string, number>()
      const uniqueTokens = new Set<string>()
      let defiValue = 0
      let ethExposure = 0
      let usualAmt = 0
      let usualVal = 0

      for (const wallet of WALLETS) {
        try {
          const [balance, tokens, protocols] = await Promise.all([
            fetchTotalBalance(wallet.address, apiKey),
            fetchTokenList(wallet.address, apiKey),
            fetchProtocolList(wallet.address, apiKey),
          ])

          const walletInfo: WalletData = {
            ...wallet,
            totalBalance: balance.total_usd_value || 0,
            tokens: tokens || [],
            protocols: protocols || [],
          }
          wallets.push(walletInfo)

          // Process tokens
          ;(tokens || []).forEach((token: any) => {
            if (isBlacklisted(token.symbol)) return
            if (isProtocolReceiptToken(token.symbol)) return
            if (token.amount <= 0 || token.price <= 0) return

            const usdValue = token.amount * token.price
            const displayName = getDisplayName(token.symbol || token.id)
            uniqueTokens.add(displayName)

            if (tokensMap.has(displayName)) {
              const existing = tokensMap.get(displayName)!
              existing.amount += token.amount
              existing.usdValue += usdValue
            } else {
              tokensMap.set(displayName, {
                symbol: displayName,
                name: token.name || displayName,
                amount: token.amount,
                price: token.price,
                usdValue: usdValue,
                logoUrl: token.logo_url,
                type: 'wallet',
              })
            }

            // Track USUAL
            const sym = (token.symbol || '').toUpperCase()
            if (sym === 'USUAL' || sym === 'USUALX') {
              usualAmt += token.amount
              usualVal += usdValue
            }

            // Track ETH exposure
            if (ETH_EXPOSURE_SYMBOLS.has(sym)) {
              ethExposure += usdValue
            }
          })

          // Process protocols
          ;(protocols || []).forEach((protocol: any) => {
            const protocolName = protocol.name || 'Unknown'
            if (SKIP_PROTOCOLS.some((p) => protocolName.toLowerCase().includes(p.toLowerCase()))) return

            ;(protocol.portfolio_item_list || []).forEach((item: any) => {
              const netValue = item.stats?.net_usd_value || 0
              if (netValue > 0) {
                defiValue += netValue

                // Protocol totals
                protocolsMap.set(protocolName, (protocolsMap.get(protocolName) || 0) + netValue)

                // Add to tokens
                const positionName = item.name || protocolName
                const key = `${protocolName}: ${positionName}`
                if (tokensMap.has(key)) {
                  tokensMap.get(key)!.usdValue += netValue
                } else {
                  tokensMap.set(key, {
                    symbol: positionName,
                    name: `${protocolName} - ${positionName}`,
                    amount: 1,
                    price: netValue,
                    usdValue: netValue,
                    logoUrl: protocol.logo_url,
                    type: 'protocol',
                    protocol: protocolName,
                  })
                }

                // ETH exposure in protocols
                const supplyTokens = item.detail?.supply_token_list || []
                const borrowTokens = item.detail?.borrow_token_list || []
                supplyTokens.forEach((t: any) => {
                  if (ETH_EXPOSURE_SYMBOLS.has((t.symbol || '').toUpperCase())) {
                    ethExposure += (t.amount || 0) * (t.price || 0)
                  }
                })
                borrowTokens.forEach((t: any) => {
                  if (ETH_EXPOSURE_SYMBOLS.has((t.symbol || '').toUpperCase())) {
                    ethExposure -= (t.amount || 0) * (t.price || 0)
                  }
                })
              }
            })
          })

          // Rate limiting
          await new Promise((r) => setTimeout(r, 200))
        } catch (err) {
          console.error(`Error fetching ${wallet.name}:`, err)
        }
      }

      // Add static wallets
      STATIC_WALLETS.forEach((sw) => {
        wallets.push(sw as WalletData)
        uniqueTokens.add('Overcollateralization')
      })

      // Calculate totals
      const total = wallets.reduce((sum, w) => sum + w.totalBalance, 0)

      // Classify strategies
      const strategies = classifyAssets(wallets)

      // Update state
      setWalletData(wallets)
      setAllTokens(Array.from(tokensMap.values()).sort((a, b) => b.usdValue - a.usdValue))
      setAllProtocols(
        Array.from(protocolsMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      )
      setTotalValue(total)
      setTotalDefiValue(defiValue)
      setTotalEthExposure(ethExposure)
      setUsualTotal({ amount: usualAmt, value: usualVal })
      setUniqueTokenCount(uniqueTokens.size)
      setStrategyData(strategies)
      setLastUpdate(new Date())
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }

  const classifyAssets = (wallets: WalletData[]) => {
    const directional: StrategyData = { total: 0, items: [] }
    const semiLiquid: StrategyData = { total: 0, items: [] }
    const liquid: StrategyData = { total: 0, items: [] }

    wallets.forEach((wallet) => {
      if (wallet.isStatic) {
        semiLiquid.total += wallet.totalBalance
        semiLiquid.items.push({ name: 'Overcollateralization', value: wallet.totalBalance })
        return
      }

      // Classify tokens
      ;(wallet.tokens || []).forEach((token: any) => {
        if (isBlacklisted(token.symbol)) return
        if (isProtocolReceiptToken(token.symbol)) return
        if (token.amount <= 0 || token.price <= 0) return

        const value = token.amount * token.price
        const symbol = (token.symbol || '').toUpperCase()
        const displayName = getDisplayName(token.symbol)

        if (DIRECTIONAL_TOKENS.has(symbol)) {
          directional.total += value
          const existing = directional.items.find((i) => i.name === displayName)
          if (existing) existing.value += value
          else directional.items.push({ name: displayName, value })
        } else {
          liquid.total += value
          const existing = liquid.items.find((i) => i.name === displayName)
          if (existing) existing.value += value
          else liquid.items.push({ name: displayName, value })
        }
      })

      // Classify protocols
      ;(wallet.protocols || []).forEach((protocol: any) => {
        const protocolName = protocol.name || ''
        if (SKIP_PROTOCOLS.some((p) => protocolName.toLowerCase().includes(p.toLowerCase()))) return

        const protocolValue =
          protocol.portfolio_item_list?.reduce((sum: number, item: any) => sum + (item.stats?.net_usd_value || 0), 0) || 0

        if (protocolValue <= 0) return

        if (DIRECTIONAL_PROTOCOLS.some((p) => protocolName.toLowerCase().includes(p.toLowerCase()))) {
          directional.total += protocolValue
          directional.items.push({ name: protocolName, value: protocolValue })
        } else if (SEMI_LIQUID_PROTOCOLS.some((p) => protocolName.toLowerCase().includes(p.toLowerCase()))) {
          semiLiquid.total += protocolValue
          semiLiquid.items.push({ name: protocolName, value: protocolValue })
        } else {
          liquid.total += protocolValue
          liquid.items.push({ name: protocolName, value: protocolValue })
        }
      })
    })

    // Sort items
    directional.items.sort((a, b) => b.value - a.value)
    semiLiquid.items.sort((a, b) => b.value - a.value)
    liquid.items.sort((a, b) => b.value - a.value)

    return { directional, semiLiquid, liquid }
  }

  // Auto-fetch when API key is set
  useEffect(() => {
    if (apiKey && walletData.length === 0) {
      fetchAllData()
    }
  }, [apiKey])

  // Render API key prompt if not set
  if (!apiKey) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🏦 USUAL DAO Treasury</h1>
          <p style={styles.subtitle}>Live Multi-Wallet Portfolio Dashboard</p>
        </div>
        <div style={styles.apiKeyContainer}>
          <p style={{ color: 'var(--vocs-color-text)', marginBottom: '8px', fontWeight: 600 }}>
            DeBank API Key Required
          </p>
          <p style={{ color: 'var(--vocs-color-text2)', fontSize: '14px' }}>
            This dashboard requires a DeBank Pro API key to fetch live wallet data.
            <br />
            Get your API key at{' '}
            <a href="https://cloud.debank.com/" target="_blank" rel="noopener noreferrer">
              cloud.debank.com
            </a>
          </p>
          <button style={styles.apiKeyButton} onClick={handleSetApiKey}>
            🔑 Set API Key
          </button>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading && walletData.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🏦 USUAL DAO Treasury</h1>
          <p style={styles.subtitle}>Live Multi-Wallet Portfolio Dashboard</p>
        </div>
        <div style={styles.loading}>Loading wallet data...</div>
      </div>
    )
  }

  const pureTreasuryValue = totalValue - usualTotal.value
  const topProtocol = allProtocols[0]

  // Strategy chart data
  const strategyChartData = strategyData
    ? [
        { name: 'Directional', value: strategyData.directional.total, color: '#f59e0b' },
        { name: 'Semi-Liquid', value: strategyData.semiLiquid.total, color: '#8b5cf6' },
        { name: 'Liquid', value: strategyData.liquid.total, color: '#00d4aa' },
      ]
    : []

  // Protocol chart data
  const walletValue = totalValue - totalDefiValue
  const protocolChartData = [
    { name: 'Wallet', value: walletValue, color: '#3b82f6' },
    ...allProtocols.slice(0, 6).map((p) => ({
      name: p.name,
      value: p.value,
      color: getProtocolColor(p.name),
    })),
  ]

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={{ ...styles.header, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ ...styles.title, marginBottom: 0 }}>🏦 USUAL DAO Treasury</h1>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: '#10B981',
              }}
            >
              <span style={{ ...styles.statusDot, backgroundColor: '#10B981' }} />
              {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'Live'}
            </span>
          </div>
          <p style={styles.subtitle}>Live Multi-Wallet Portfolio Dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={styles.refreshButton} onClick={handleSetApiKey}>
            🔑 API Key
          </button>
          <button style={styles.refreshButton} onClick={fetchAllData} disabled={isLoading}>
            {isLoading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '24px',
          }}
        >
          {error}
        </div>
      )}

      {/* Stats Overview */}
      <div style={styles.statsGrid}>
        <StatCard label="💰 Total Value" value={formatUSD(totalValue)} sub={`${walletData.length} addresses tracked`} color="#10B981" />
        <StatCard
          label="💎 Pure Treasury"
          value={formatUSD(pureTreasuryValue)}
          sub={`${((pureTreasuryValue / totalValue) * 100).toFixed(1)}% · wo/ USUAL`}
          color="#06b6d4"
        />
        <StatCard label="🪙 Unique Tokens" value={String(uniqueTokenCount)} sub="Wallet tokens (excl. receipts)" color="#8b5cf6" />
        <StatCard
          label="⟠ ETH Exposure"
          value={formatUSD(totalEthExposure)}
          sub={`${((totalEthExposure / totalValue) * 100).toFixed(1)}% of portfolio`}
          color="#f59e0b"
        />
        <StatCard label="🔒 USUAL Holdings" value={formatNumber(usualTotal.amount)} sub={formatUSD(usualTotal.value)} color="#ec4899" />
        {topProtocol && (
          <StatCard
            label="📊 Top Protocol"
            value={topProtocol.name}
            sub={`${formatUSD(topProtocol.value)} (${((topProtocol.value / totalValue) * 100).toFixed(1)}%)`}
            color="#3b82f6"
          />
        )}
      </div>

      {/* Protocol Summary */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📊 Allocation by Protocol</h3>
        <div style={styles.protocolGrid}>
          <div style={styles.protocolCard}>
            <ProtocolBadge name="Wallet" />
            <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '8px' }}>{formatUSD(walletValue)}</div>
            <div style={{ fontSize: '12px', color: 'var(--vocs-color-text2)' }}>
              {((walletValue / totalValue) * 100).toFixed(1)}% of portfolio
            </div>
          </div>
          {allProtocols.slice(0, 7).map((protocol) => (
            <div key={protocol.name} style={styles.protocolCard}>
              <ProtocolBadge name={protocol.name} />
              <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '8px' }}>{formatUSD(protocol.value)}</div>
              <div style={{ fontSize: '12px', color: 'var(--vocs-color-text2)' }}>
                {((protocol.value / totalValue) * 100).toFixed(1)}% of portfolio
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy Allocation */}
      {strategyData && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>🎯 Strategy Allocation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={strategyChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {strategyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatUSD(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={styles.strategyGrid}>
              {[
                { key: 'directional', data: strategyData.directional, color: '#f59e0b', icon: '📈', title: 'Directional' },
                { key: 'semiLiquid', data: strategyData.semiLiquid, color: '#8b5cf6', icon: '🔒', title: 'Semi-Liquid' },
                { key: 'liquid', data: strategyData.liquid, color: '#00d4aa', icon: '💧', title: 'Liquid' },
              ].map(({ key, data, color, icon, title }) => (
                <div key={key} style={styles.strategyCard}>
                  <div style={{ ...styles.statCardAccent, background: color }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{icon}</span>
                    <span style={{ fontWeight: 700, fontSize: '16px' }}>{title}</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color, marginBottom: '4px' }}>{formatUSD(data.total)}</div>
                  <div style={{ fontSize: '13px', color: 'var(--vocs-color-text2)', marginBottom: '16px' }}>
                    {((data.total / totalValue) * 100).toFixed(1)}% of portfolio
                  </div>
                  <div style={{ borderTop: '1px solid var(--vocs-color-border)', paddingTop: '12px' }}>
                    {data.items.slice(0, 4).map((item) => (
                      <div
                        key={item.name}
                        style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 0' }}
                      >
                        <span style={{ color: 'var(--vocs-color-text2)' }}>{item.name}</span>
                        <span>{formatUSD(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Wallets Table */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🏛️ Wallet Overview</h3>
        <div style={styles.card}>
          <div style={styles.cardBody}>
            {walletData
              .sort((a, b) => b.totalBalance - a.totalBalance)
              .map((wallet) => (
                <div key={wallet.address} style={styles.walletRow}>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                      <a
                        href={`https://debank.com/profile/${wallet.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--vocs-color-link)' }}
                      >
                        {shortenAddress(wallet.address)}
                      </a>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--vocs-color-text2)', marginTop: '2px' }}>
                      {wallet.emoji} {wallet.name}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {!wallet.isStatic && <ProtocolBadge name="Wallet" />}
                    {wallet.isStatic ? (
                      <ProtocolBadge name="Usual" />
                    ) : (
                      (wallet.protocols || [])
                        .slice(0, 3)
                        .map((p: any) => <ProtocolBadge key={p.name} name={p.name} />)
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>{formatUSD(wallet.totalBalance)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--vocs-color-text2)' }}>
                      {((wallet.totalBalance / totalValue) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Top Holdings */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🪙 Top Holdings</h3>
        <div style={styles.card}>
          <div style={{ ...styles.cardBody, maxHeight: '500px', overflowY: 'auto' }}>
            {allTokens.slice(0, 15).map((token) => (
              <div key={token.symbol + token.type} style={styles.tokenItem}>
                <div
                  style={{
                    ...styles.tokenIcon,
                    ...(token.logoUrl ? { backgroundImage: `url(${token.logoUrl})` } : {}),
                    backgroundColor: token.type === 'protocol' ? `${getProtocolColor(token.protocol || '')}30` : undefined,
                    color: token.type === 'protocol' ? getProtocolColor(token.protocol || '') : undefined,
                  }}
                >
                  {!token.logoUrl && (token.type === 'protocol' ? '🏦' : token.symbol.slice(0, 3))}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {token.symbol}
                    <span
                      style={{
                        ...styles.badge,
                        backgroundColor: token.type === 'protocol' ? `${getProtocolColor(token.protocol || '')}20` : '#3b82f620',
                        color: token.type === 'protocol' ? getProtocolColor(token.protocol || '') : '#3b82f6',
                        fontSize: '9px',
                      }}
                    >
                      {token.type === 'protocol' ? 'PROTOCOL' : 'WALLET'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--vocs-color-text2)' }}>
                    {token.type === 'protocol' ? (
                      <span style={{ color: getProtocolColor(token.protocol || '') }}>📊 {token.protocol}</span>
                    ) : (
                      `${formatNumber(token.amount)} @ $${token.price.toFixed(4)}`
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{formatUSD(token.usdValue)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--vocs-color-text2)' }}>
                    {((token.usdValue / totalValue) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Source Notice */}
      <div
        style={{
          marginTop: '40px',
          padding: '16px',
          backgroundColor: 'var(--vocs-color-background2)',
          borderRadius: '8px',
          border: '1px solid var(--vocs-color-border)',
        }}
      >
        <p style={{ fontSize: '12px', color: 'var(--vocs-color-text3)' }}>
          Data source: DeBank Pro API. Tracking {WALLETS.length + STATIC_WALLETS.length} wallets.
        </p>
      </div>
    </div>
  )
}

export default TreasuryDashboard
