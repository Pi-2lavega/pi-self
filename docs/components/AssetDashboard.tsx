import React, { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'

// Types for asset data
interface AssetDataPoint {
  timestamp: string
  price: number
  delta: number
  rate: number
}

interface AssetData {
  [key: string]: AssetDataPoint[]
}

// Mock data generator - Replace with actual Dune API integration
const generateMockData = (basePrice: number, baseRate: number, days: number = 30): AssetDataPoint[] => {
  const data: AssetDataPoint[] = []
  const now = new Date()

  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // Add some realistic variation
    const priceVariation = (Math.random() - 0.5) * 0.02 * basePrice
    const rateVariation = (Math.random() - 0.5) * 0.5

    const price = basePrice + priceVariation + (i * 0.001 * basePrice)
    const rate = baseRate + rateVariation
    const delta = (Math.random() - 0.5) * 0.1

    data.push({
      timestamp: date.toISOString().split('T')[0],
      price: Number(price.toFixed(4)),
      delta: Number(delta.toFixed(4)),
      rate: Number(rate.toFixed(2)),
    })
  }

  return data
}

// Asset configurations with colors
const ASSETS = {
  SPKCC: {
    name: 'SPKCC',
    color: '#8B5CF6',
    basePrice: 1.0,
    baseRate: 4.5,
  },
  eurSPKCC: {
    name: 'eurSPKCC',
    color: '#3B82F6',
    basePrice: 1.08,
    baseRate: 3.8,
  },
  USCC: {
    name: 'USCC',
    color: '#10B981',
    basePrice: 1.0,
    baseRate: 5.2,
  },
}

// Styles
const styles = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  card: {
    backgroundColor: 'var(--vocs-color-background2)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid var(--vocs-color-border)',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--vocs-color-text2)',
    marginBottom: '8px',
  },
  cardValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: 'var(--vocs-color-text)',
  },
  cardSubtext: {
    fontSize: '12px',
    color: 'var(--vocs-color-text3)',
    marginTop: '4px',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '16px',
    color: 'var(--vocs-color-text)',
  },
  chartContainer: {
    backgroundColor: 'var(--vocs-color-background2)',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid var(--vocs-color-border)',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '16px',
    color: 'var(--vocs-color-text)',
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  tab: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--vocs-color-border)',
    backgroundColor: 'transparent',
    color: 'var(--vocs-color-text2)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  tabActive: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--vocs-color-primary)',
    backgroundColor: 'var(--vocs-color-primary)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  positive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10B981',
  },
  negative: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#EF4444',
  },
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: 'var(--vocs-color-background)',
        border: '1px solid var(--vocs-color-border)',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}>
        <p style={{ fontSize: '12px', color: 'var(--vocs-color-text2)', marginBottom: '8px' }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ fontSize: '14px', color: entry.color, marginBottom: '4px' }}>
            {entry.name}: {entry.value.toFixed(4)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function AssetDashboard() {
  const [assetData, setAssetData] = useState<AssetData>({})
  const [selectedAsset, setSelectedAsset] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<number>(30)

  useEffect(() => {
    // Generate mock data for each asset
    const data: AssetData = {}
    Object.entries(ASSETS).forEach(([key, config]) => {
      data[key] = generateMockData(config.basePrice, config.baseRate, timeRange)
    })
    setAssetData(data)
  }, [timeRange])

  // Get latest values for summary cards
  const getLatestValue = (asset: string, field: keyof AssetDataPoint) => {
    const data = assetData[asset]
    if (!data || data.length === 0) return 0
    return data[data.length - 1][field]
  }

  // Prepare data for combined yield chart
  const prepareYieldChartData = () => {
    if (!assetData.SPKCC) return []

    return assetData.SPKCC.map((_, index) => ({
      timestamp: assetData.SPKCC[index].timestamp,
      SPKCC: assetData.SPKCC[index]?.rate || 0,
      eurSPKCC: assetData.eurSPKCC?.[index]?.rate || 0,
      USCC: assetData.USCC?.[index]?.rate || 0,
    }))
  }

  // Prepare data for price chart of a specific asset
  const preparePriceChartData = (asset: string) => {
    return assetData[asset] || []
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Asset Dashboard</h1>
        <p style={styles.subtitle}>Real-time yield and price data for SPKCC, eurSPKCC, and USCC</p>
      </div>

      {/* Time Range Selector */}
      <div style={styles.tabContainer}>
        {[7, 14, 30, 90].map((days) => (
          <button
            key={days}
            style={timeRange === days ? styles.tabActive : styles.tab}
            onClick={() => setTimeRange(days)}
          >
            {days}D
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div style={styles.grid}>
        {Object.entries(ASSETS).map(([key, config]) => {
          const currentRate = getLatestValue(key, 'rate')
          const currentPrice = getLatestValue(key, 'price')
          const delta = getLatestValue(key, 'delta')

          return (
            <div key={key} style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={styles.cardTitle}>{config.name}</p>
                  <p style={styles.cardValue}>{currentRate.toFixed(2)}%</p>
                  <p style={styles.cardSubtext}>Current APR</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ ...styles.cardTitle, marginBottom: '4px' }}>Price</p>
                  <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--vocs-color-text)' }}>
                    ${currentPrice.toFixed(4)}
                  </p>
                  <span style={{
                    ...styles.badge,
                    ...(delta >= 0 ? styles.positive : styles.negative),
                  }}>
                    {delta >= 0 ? '+' : ''}{(delta * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
              <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: 'var(--vocs-color-border)',
                borderRadius: '2px',
                marginTop: '16px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(currentRate / 10) * 100}%`,
                  height: '100%',
                  backgroundColor: config.color,
                  borderRadius: '2px',
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Combined Yield Chart */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Yield Comparison (APR %)</h2>
        <div style={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={prepareYieldChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--vocs-color-border)" />
              <XAxis
                dataKey="timestamp"
                stroke="var(--vocs-color-text3)"
                fontSize={12}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
              />
              <YAxis
                stroke="var(--vocs-color-text3)"
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {Object.entries(ASSETS).map(([key, config]) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={config.name}
                  stroke={config.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Individual Price Charts */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Price Charts by Asset</h2>

        {/* Asset Selector */}
        <div style={styles.tabContainer}>
          <button
            style={selectedAsset === 'all' ? styles.tabActive : styles.tab}
            onClick={() => setSelectedAsset('all')}
          >
            All Assets
          </button>
          {Object.entries(ASSETS).map(([key, config]) => (
            <button
              key={key}
              style={selectedAsset === key ? styles.tabActive : styles.tab}
              onClick={() => setSelectedAsset(key)}
            >
              {config.name}
            </button>
          ))}
        </div>

        {/* Price Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedAsset === 'all' ? 'repeat(auto-fit, minmax(400px, 1fr))' : '1fr', gap: '24px' }}>
          {(selectedAsset === 'all' ? Object.keys(ASSETS) : [selectedAsset]).map((assetKey) => {
            const config = ASSETS[assetKey as keyof typeof ASSETS]
            const data = preparePriceChartData(assetKey)

            return (
              <div key={assetKey} style={styles.chartContainer}>
                <h3 style={styles.chartTitle}>{config.name} Price</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`gradient-${assetKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--vocs-color-border)" />
                    <XAxis
                      dataKey="timestamp"
                      stroke="var(--vocs-color-text3)"
                      fontSize={12}
                      tickFormatter={(value) => {
                        const date = new Date(value)
                        return `${date.getMonth() + 1}/${date.getDate()}`
                      }}
                    />
                    <YAxis
                      stroke="var(--vocs-color-text3)"
                      fontSize={12}
                      domain={['auto', 'auto']}
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="price"
                      name="Price"
                      stroke={config.color}
                      strokeWidth={2}
                      fill={`url(#gradient-${assetKey})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )
          })}
        </div>
      </div>

      {/* Data Source Notice */}
      <div style={{
        marginTop: '40px',
        padding: '16px',
        backgroundColor: 'var(--vocs-color-background2)',
        borderRadius: '8px',
        border: '1px solid var(--vocs-color-border)',
      }}>
        <p style={{ fontSize: '12px', color: 'var(--vocs-color-text3)' }}>
          Data source: Dune Analytics queries (6603491, 6598168, 6603571).
          Currently displaying mock data - integrate Dune API for live data.
        </p>
      </div>
    </div>
  )
}

export default AssetDashboard
