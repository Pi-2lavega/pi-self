import React, { useState, useEffect } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
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

// Color palette
const COLORS = {
  green: '#10B981',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  orange: '#F59E0B',
  cyan: '#06B6D4',
  red: '#EF4444',
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
  return colors[key] || '#6B7280'
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
const fetchDeBank = async (endpoint: string, address: string, apiKey: string): Promise<any> => {
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'

  if (isLocalhost) {
    const endpoints: Record<string, string> = {
      total_balance: `https://pro-openapi.debank.com/v1/user/total_balance?id=${address}`,
      all_token_list: `https://pro-openapi.debank.com/v1/user/all_token_list?id=${address}&is_all=true`,
      all_complex_protocol_list: `https://pro-openapi.debank.com/v1/user/all_complex_protocol_list?id=${address}`,
    }
    const targetUrl = endpoints[endpoint]
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
    const response = await fetch(proxyUrl, {
      headers: {
        'x-cors-api-key': 'temp_' + Date.now(),
        AccessKey: apiKey,
      },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
  }

  const apiUrl = `/api/debank?endpoint=${endpoint}&address=${address}&apiKey=${encodeURIComponent(apiKey)}`
  const response = await fetch(apiUrl)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}`)
  }
  return response.json()
}

const fetchTotalBalance = async (address: string, apiKey: string): Promise<any> => {
  return fetchDeBank('total_balance', address, apiKey)
}

const fetchTokenList = async (address: string, apiKey: string): Promise<any[]> => {
  return fetchDeBank('all_token_list', address, apiKey)
}

const fetchProtocolList = async (address: string, apiKey: string): Promise<any[]> => {
  return fetchDeBank('all_complex_protocol_list', address, apiKey)
}

// CSS Keyframes (injected once)
const injectStyles = () => {
  if (typeof document === 'undefined') return
  if (document.getElementById('treasury-dashboard-styles')) return

  const style = document.createElement('style')
  style.id = 'treasury-dashboard-styles'
  style.textContent = `
    @keyframes treasury-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes treasury-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes treasury-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes treasury-fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .treasury-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
    .treasury-wallet-row:hover {
      background: var(--vocs-color-background) !important;
    }
    .treasury-token-row:hover {
      background: var(--vocs-color-background) !important;
    }
    .treasury-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .treasury-protocol-card:hover {
      border-color: var(--vocs-color-text3);
      transform: scale(1.02);
    }
  `
  document.head.appendChild(style)
}

// Components
const LoadingSpinner: React.FC = () => (
  <div
    style={{
      width: '20px',
      height: '20px',
      border: '2px solid var(--vocs-color-border)',
      borderTopColor: COLORS.blue,
      borderRadius: '50%',
      animation: 'treasury-spin 1s linear infinite',
    }}
  />
)

const SkeletonLoader: React.FC<{ width?: string; height?: string }> = ({ width = '100%', height = '20px' }) => (
  <div
    style={{
      width,
      height,
      background: 'linear-gradient(90deg, var(--vocs-color-background2) 25%, var(--vocs-color-background) 50%, var(--vocs-color-background2) 75%)',
      backgroundSize: '200% 100%',
      animation: 'treasury-shimmer 1.5s infinite',
      borderRadius: '4px',
    }}
  />
)

const StatCard: React.FC<{
  label: string
  value: string
  sub?: string
  color: string
  icon?: string
  isLoading?: boolean
}> = ({ label, value, sub, color, icon, isLoading }) => (
  <div
    className="treasury-card"
    style={{
      background: 'var(--vocs-color-background2)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid var(--vocs-color-border)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      cursor: 'default',
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
      }}
    />
    <div
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        fontSize: '28px',
        opacity: 0.15,
      }}
    >
      {icon}
    </div>
    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--vocs-color-text2)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {label}
    </div>
    {isLoading ? (
      <SkeletonLoader height="36px" width="80%" />
    ) : (
      <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--vocs-color-text)', lineHeight: 1.1 }}>{value}</div>
    )}
    {sub && !isLoading && (
      <div style={{ fontSize: '13px', color: 'var(--vocs-color-text3)', marginTop: '8px' }}>{sub}</div>
    )}
  </div>
)

const ProtocolBadge: React.FC<{ name: string; size?: 'sm' | 'md' }> = ({ name, size = 'sm' }) => {
  const color = getProtocolColor(name)
  return (
    <span
      style={{
        padding: size === 'sm' ? '4px 10px' : '6px 14px',
        borderRadius: '8px',
        fontSize: size === 'sm' ? '11px' : '13px',
        fontWeight: 600,
        backgroundColor: `${color}18`,
        color: color,
        border: `1px solid ${color}30`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      {name}
    </span>
  )
}

const GlassCard: React.FC<{
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}> = ({ children, style, className }) => (
  <div
    className={className}
    style={{
      background: 'var(--vocs-color-background2)',
      borderRadius: '20px',
      border: '1px solid var(--vocs-color-border)',
      overflow: 'hidden',
      ...style,
    }}
  >
    {children}
  </div>
)

export function TreasuryDashboard() {
  const [apiKey, setApiKey] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingProgress, setLoadingProgress] = useState<number>(0)

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

  useEffect(() => {
    injectStyles()
    const storedKey = localStorage.getItem('DEBANK_API_KEY')
    if (storedKey) setApiKey(storedKey)
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
    setLoadingProgress(0)

    try {
      const wallets: WalletData[] = []
      const tokensMap = new Map<string, TokenData>()
      const protocolsMap = new Map<string, number>()
      const uniqueTokens = new Set<string>()
      let defiValue = 0
      let ethExposure = 0
      let usualAmt = 0
      let usualVal = 0

      const totalWallets = WALLETS.length
      for (let i = 0; i < WALLETS.length; i++) {
        const wallet = WALLETS[i]
        setLoadingProgress(Math.round(((i + 1) / totalWallets) * 100))

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

            const sym = (token.symbol || '').toUpperCase()
            if (sym === 'USUAL' || sym === 'USUALX') {
              usualAmt += token.amount
              usualVal += usdValue
            }

            if (ETH_EXPOSURE_SYMBOLS.has(sym)) {
              ethExposure += usdValue
            }
          })

          ;(protocols || []).forEach((protocol: any) => {
            const protocolName = protocol.name || 'Unknown'
            if (SKIP_PROTOCOLS.some((p) => protocolName.toLowerCase().includes(p.toLowerCase()))) return

            ;(protocol.portfolio_item_list || []).forEach((item: any) => {
              const netValue = item.stats?.net_usd_value || 0
              if (netValue > 0) {
                defiValue += netValue
                protocolsMap.set(protocolName, (protocolsMap.get(protocolName) || 0) + netValue)

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

          await new Promise((r) => setTimeout(r, 200))
        } catch (err) {
          console.error(`Error fetching ${wallet.name}:`, err)
        }
      }

      STATIC_WALLETS.forEach((sw) => {
        wallets.push(sw as WalletData)
        uniqueTokens.add('Overcollateralization')
      })

      const total = wallets.reduce((sum, w) => sum + w.totalBalance, 0)
      const strategies = classifyAssets(wallets)

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
      setLoadingProgress(0)
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

    directional.items.sort((a, b) => b.value - a.value)
    semiLiquid.items.sort((a, b) => b.value - a.value)
    liquid.items.sort((a, b) => b.value - a.value)

    return { directional, semiLiquid, liquid }
  }

  useEffect(() => {
    if (apiKey && walletData.length === 0) {
      fetchAllData()
    }
  }, [apiKey])

  // Render API key prompt
  if (!apiKey) {
    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏦</div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--vocs-color-text)', marginBottom: '8px' }}>
            USUAL DAO Treasury
          </h1>
          <p style={{ color: 'var(--vocs-color-text2)', fontSize: '16px' }}>
            Live Multi-Wallet Portfolio Dashboard
          </p>
        </div>
        <GlassCard style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔑</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: 'var(--vocs-color-text)' }}>
            API Key Required
          </h2>
          <p style={{ color: 'var(--vocs-color-text2)', marginBottom: '24px', lineHeight: 1.6 }}>
            This dashboard requires a DeBank Pro API key to fetch live wallet data.
            Get your API key at{' '}
            <a href="https://cloud.debank.com/" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.blue }}>
              cloud.debank.com
            </a>
          </p>
          <button
            className="treasury-btn"
            onClick={handleSetApiKey}
            style={{
              background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.purple})`,
              color: 'white',
              border: 'none',
              padding: '14px 32px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Enter API Key
          </button>
        </GlassCard>
      </div>
    )
  }

  // Loading state
  if (isLoading && walletData.length === 0) {
    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏦</div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--vocs-color-text)', marginBottom: '8px' }}>
            USUAL DAO Treasury
          </h1>
        </div>
        <GlassCard style={{ padding: '40px', textAlign: 'center' }}>
          <LoadingSpinner />
          <p style={{ marginTop: '20px', color: 'var(--vocs-color-text2)', fontSize: '16px' }}>
            Loading wallet data...
          </p>
          <div style={{ marginTop: '16px', background: 'var(--vocs-color-background)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${loadingProgress}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${COLORS.blue}, ${COLORS.purple})`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <p style={{ marginTop: '8px', color: 'var(--vocs-color-text3)', fontSize: '13px' }}>
            {loadingProgress}% - Fetching {Math.ceil((loadingProgress / 100) * WALLETS.length)}/{WALLETS.length} wallets
          </p>
        </GlassCard>
      </div>
    )
  }

  const pureTreasuryValue = totalValue - usualTotal.value
  const topProtocol = allProtocols[0]
  const walletValue = totalValue - totalDefiValue

  const strategyChartData = strategyData
    ? [
        { name: 'Directional', value: strategyData.directional.total, color: COLORS.orange },
        { name: 'Semi-Liquid', value: strategyData.semiLiquid.total, color: COLORS.purple },
        { name: 'Liquid', value: strategyData.liquid.total, color: COLORS.green },
      ]
    : []

  const protocolChartData = [
    { name: 'Wallet', value: walletValue },
    ...allProtocols.slice(0, 5),
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--vocs-color-text)', margin: 0 }}>
              🏦 USUAL DAO Treasury
            </h1>
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: `${COLORS.green}18`,
                color: COLORS.green,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS.green, animation: 'treasury-pulse 2s infinite' }} />
              {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : 'Live'}
            </span>
          </div>
          <p style={{ color: 'var(--vocs-color-text2)', fontSize: '16px', margin: 0 }}>
            Live Multi-Wallet Portfolio Dashboard
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="treasury-btn"
            onClick={handleSetApiKey}
            style={{
              background: 'var(--vocs-color-background2)',
              border: '1px solid var(--vocs-color-border)',
              color: 'var(--vocs-color-text)',
              padding: '10px 18px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            🔑 API Key
          </button>
          <button
            className="treasury-btn"
            onClick={fetchAllData}
            disabled={isLoading}
            style={{
              background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.purple})`,
              border: 'none',
              color: 'white',
              padding: '10px 18px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: isLoading ? 0.7 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {isLoading ? <LoadingSpinner /> : '🔄'} Refresh
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: `${COLORS.red}15`,
            border: `1px solid ${COLORS.red}40`,
            color: COLORS.red,
            padding: '16px 20px',
            borderRadius: '12px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '20px' }}>⚠️</span>
          {error}
        </div>
      )}

      {/* Main Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <StatCard label="Total Value" value={formatUSD(totalValue)} sub={`${walletData.length} wallets tracked`} color={COLORS.green} icon="💰" />
        <StatCard label="Pure Treasury" value={formatUSD(pureTreasuryValue)} sub={`${((pureTreasuryValue / totalValue) * 100).toFixed(1)}% (excl. USUAL)`} color={COLORS.cyan} icon="💎" />
        <StatCard label="ETH Exposure" value={formatUSD(totalEthExposure)} sub={`${((totalEthExposure / totalValue) * 100).toFixed(1)}% of portfolio`} color={COLORS.orange} icon="⟠" />
        <StatCard label="USUAL Holdings" value={formatNumber(usualTotal.amount)} sub={formatUSD(usualTotal.value)} color={COLORS.pink} icon="🔒" />
        <StatCard label="Unique Tokens" value={String(uniqueTokenCount)} sub="Wallet tokens" color={COLORS.purple} icon="🪙" />
        {topProtocol && (
          <StatCard label="Top Protocol" value={topProtocol.name} sub={`${formatUSD(topProtocol.value)} (${((topProtocol.value / totalValue) * 100).toFixed(1)}%)`} color={COLORS.blue} icon="📊" />
        )}
      </div>

      {/* Strategy Allocation */}
      {strategyData && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px', color: 'var(--vocs-color-text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🎯 Strategy Allocation
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
            <GlassCard style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={strategyChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {strategyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatUSD(value)}
                    contentStyle={{
                      background: 'var(--vocs-color-background2)',
                      border: '1px solid var(--vocs-color-border)',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </GlassCard>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[
                { key: 'directional', data: strategyData.directional, color: COLORS.orange, icon: '📈', title: 'Directional', desc: 'Volatile assets & exposure' },
                { key: 'semiLiquid', data: strategyData.semiLiquid, color: COLORS.purple, icon: '🔒', title: 'Semi-Liquid', desc: 'Lending & collateral' },
                { key: 'liquid', data: strategyData.liquid, color: COLORS.green, icon: '💧', title: 'Liquid', desc: 'Stables & yield' },
              ].map(({ key, data, color, icon, title, desc }) => (
                <GlassCard key={key} style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--vocs-color-text)' }}>{title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--vocs-color-text3)' }}>{desc}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color, marginBottom: '4px' }}>{formatUSD(data.total)}</div>
                  <div style={{ fontSize: '13px', color: 'var(--vocs-color-text3)', marginBottom: '16px' }}>
                    {((data.total / totalValue) * 100).toFixed(1)}% of portfolio
                  </div>
                  <div style={{ borderTop: '1px solid var(--vocs-color-border)', paddingTop: '12px' }}>
                    {data.items.slice(0, 3).map((item) => (
                      <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', color: 'var(--vocs-color-text2)' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{item.name}</span>
                        <span style={{ fontWeight: 600, color: 'var(--vocs-color-text)' }}>{formatUSD(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Protocol Allocation */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px', color: 'var(--vocs-color-text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          📊 Protocol Allocation
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {[{ name: 'Wallet', value: walletValue }, ...allProtocols.slice(0, 7)].map((protocol) => (
            <GlassCard
              key={protocol.name}
              className="treasury-protocol-card"
              style={{ padding: '20px', cursor: 'default', transition: 'all 0.2s ease' }}
            >
              <div style={{ marginBottom: '12px' }}>
                <ProtocolBadge name={protocol.name} size="md" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--vocs-color-text)', marginBottom: '4px' }}>{formatUSD(protocol.value)}</div>
              <div style={{ fontSize: '13px', color: 'var(--vocs-color-text3)' }}>
                {((protocol.value / totalValue) * 100).toFixed(1)}% of portfolio
              </div>
              <div
                style={{
                  marginTop: '12px',
                  height: '4px',
                  background: 'var(--vocs-color-background)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${(protocol.value / totalValue) * 100}%`,
                    height: '100%',
                    background: getProtocolColor(protocol.name),
                    borderRadius: '2px',
                  }}
                />
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {/* Wallets Table */}
        <GlassCard>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--vocs-color-border)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--vocs-color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              🏛️ Wallet Overview
            </h3>
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {walletData
              .sort((a, b) => b.totalBalance - a.totalBalance)
              .map((wallet, index) => (
                <div
                  key={wallet.address}
                  className="treasury-wallet-row"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    borderBottom: index < walletData.length - 1 ? '1px solid var(--vocs-color-border)' : 'none',
                    transition: 'background 0.2s ease',
                    cursor: 'default',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{wallet.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--vocs-color-text)' }}>{wallet.name}</div>
                      <a
                        href={`https://debank.com/profile/${wallet.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontFamily: 'monospace', fontSize: '12px', color: COLORS.blue, textDecoration: 'none' }}
                      >
                        {shortenAddress(wallet.address)}
                      </a>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--vocs-color-text)' }}>{formatUSD(wallet.totalBalance)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--vocs-color-text3)' }}>
                      {((wallet.totalBalance / totalValue) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </GlassCard>

        {/* Top Holdings */}
        <GlassCard>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--vocs-color-border)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--vocs-color-text)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              🪙 Top Holdings
            </h3>
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {allTokens.slice(0, 12).map((token, index) => (
              <div
                key={token.symbol + token.type + index}
                className="treasury-token-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 24px',
                  borderBottom: index < 11 ? '1px solid var(--vocs-color-border)' : 'none',
                  transition: 'background 0.2s ease',
                  cursor: 'default',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    marginRight: '14px',
                    backgroundColor: token.type === 'protocol' ? `${getProtocolColor(token.protocol || '')}20` : 'var(--vocs-color-background)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: token.type === 'protocol' ? getProtocolColor(token.protocol || '') : 'var(--vocs-color-text2)',
                    backgroundImage: token.logoUrl ? `url(${token.logoUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {!token.logoUrl && (token.type === 'protocol' ? '📊' : token.symbol.slice(0, 2))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--vocs-color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {token.symbol}
                    </span>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: 600,
                        backgroundColor: token.type === 'protocol' ? `${getProtocolColor(token.protocol || '')}20` : `${COLORS.blue}20`,
                        color: token.type === 'protocol' ? getProtocolColor(token.protocol || '') : COLORS.blue,
                      }}
                    >
                      {token.type === 'protocol' ? 'DEFI' : 'WALLET'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--vocs-color-text3)' }}>
                    {token.type === 'protocol' ? token.protocol : `${formatNumber(token.amount)} @ $${token.price.toFixed(4)}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--vocs-color-text)' }}>{formatUSD(token.usdValue)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--vocs-color-text3)' }}>{((token.usdValue / totalValue) * 100).toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '20px 24px',
          background: 'var(--vocs-color-background2)',
          borderRadius: '12px',
          border: '1px solid var(--vocs-color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ fontSize: '13px', color: 'var(--vocs-color-text3)' }}>
          Data source: DeBank Pro API • Tracking {WALLETS.length + STATIC_WALLETS.length} wallets
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
          <a href="https://debank.com" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.blue, textDecoration: 'none' }}>
            DeBank
          </a>
          <a href="https://etherscan.io" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.blue, textDecoration: 'none' }}>
            Etherscan
          </a>
        </div>
      </div>
    </div>
  )
}

export default TreasuryDashboard
