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
  ReferenceLine,
  ReferenceArea,
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

// Dune API configuration - API key is public for read-only queries
const DUNE_API_KEY = 'pVz4HUV0jHBkFDgtwpzV9LXSC4hYqiTf'

const DUNE_QUERIES = {
  SPKCC: 6603491,
  eurSPKCC: 6598168,
  USCC: 6603571,
}

// Fetch data from Dune API using codetabs CORS proxy
const fetchDuneData = async (queryId: number): Promise<any[]> => {
  try {
    console.log('Fetching Dune data for query:', queryId)

    const duneUrl = `https://api.dune.com/api/v1/query/${queryId}/results?api_key=${DUNE_API_KEY}`
    const proxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(duneUrl)}`

    const response = await fetch(proxyUrl)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('Dune data received:', data.result?.rows?.length, 'rows')
    return data.result?.rows || []
  } catch (error) {
    console.error('Error fetching Dune data:', error)
    return []
  }
}

// Transform Dune data to our format
const transformDuneData = (rows: any[], assetKey: string): AssetDataPoint[] => {
  // Log first row to debug data structure
  if (rows.length > 0) {
    console.log(`Dune row sample for ${assetKey}:`, rows[0])
  }

  const transformedRows = rows
    .map((row) => {
      // Handle different timestamp formats (Dune uses "YYYY-MM-DD HH:MM:SS.sss UTC")
      const rawTimestamp = row.timestamp || row.date || row.time || row.block_time || ''
      let timestamp: string
      if (typeof rawTimestamp === 'string') {
        // Extract just the date part from "2025-11-06 17:29:35.000 UTC"
        timestamp = rawTimestamp.split(' ')[0]
      } else {
        timestamp = new Date(rawTimestamp).toISOString().split('T')[0]
      }

      const price = Number(row.price) || 0
      const delta = Number(row.delta) || 0

      // Rate will be calculated after sorting based on actual price changes
      return { timestamp, price, delta, rate: 0 }
    })
    .filter((row) => row.timestamp && row.timestamp !== 'Invalid Date' && row.price > 0)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  // Calculate APR based on actual time elapsed between data points
  // We calculate the overall APR from the dataset's start to each point
  if (transformedRows.length < 2) {
    return transformedRows
  }

  const startDate = new Date(transformedRows[0].timestamp)
  const startPrice = transformedRows[0].price

  for (let i = 0; i < transformedRows.length; i++) {
    const currDate = new Date(transformedRows[i].timestamp)
    const currPrice = transformedRows[i].price

    // Calculate days elapsed from start
    const daysElapsed = Math.max(1, (currDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    if (startPrice > 0 && daysElapsed > 0) {
      // Calculate total return and annualize it
      const totalReturn = (currPrice - startPrice) / startPrice
      // APR = (total return / days elapsed) * 365 * 100
      transformedRows[i].rate = (totalReturn / daysElapsed) * 365 * 100
    }

    // Clamp rate to reasonable bounds (-5% to 20% APR for stable yield tokens)
    // Allow small negative values for transparency
    transformedRows[i].rate = Math.max(-5, Math.min(20, transformedRows[i].rate))
  }

  // Log the calculated APR for debugging
  if (transformedRows.length > 0) {
    const lastRow = transformedRows[transformedRows.length - 1]
    const daysTotal = Math.max(1, (new Date(lastRow.timestamp).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    console.log(`${assetKey} APR calculation: start=${startPrice.toFixed(6)}, end=${lastRow.price.toFixed(6)}, days=${daysTotal.toFixed(0)}, APR=${lastRow.rate.toFixed(2)}%`)
  }

  return transformedRows
}

// Mock data generator - Used when API key is not configured
const generateMockData = (basePrice: number, baseRate: number, days: number = 30): AssetDataPoint[] => {
  const data: AssetDataPoint[] = []
  const now = new Date()

  const dailyYield = baseRate / 100 / 365

  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    const daysElapsed = days - i
    const accumulatedYield = basePrice * dailyYield * daysElapsed
    const randomVariation = (Math.random() - 0.5) * 0.002 * basePrice
    const price = basePrice + accumulatedYield + randomVariation

    const rateVariation = (Math.random() - 0.5) * 0.5
    const rate = baseRate + rateVariation
    const delta = dailyYield + (Math.random() - 0.5) * 0.001

    data.push({
      timestamp: date.toISOString().split('T')[0],
      price: Number(price.toFixed(6)),
      delta: Number(delta.toFixed(6)),
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
    backgroundColor: 'var(--vocs-color-background2)',
    color: 'var(--vocs-color-text2)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  tabActive: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '2px solid var(--vocs-color-primary)',
    backgroundColor: 'var(--vocs-color-background)',
    color: 'var(--vocs-color-primary)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    boxShadow: '0 0 0 1px var(--vocs-color-primary)',
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
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: 'var(--vocs-color-text2)',
  },
  apiStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 500,
  },
  apiLive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10B981',
  },
  apiMock: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: '#F59E0B',
  },
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Filter out null/undefined values
    const validPayload = payload.filter((entry: any) => entry.value != null)
    if (validPayload.length === 0) return null

    const formatValue = (entry: any) => {
      const value = typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value
      // ROI values don't have %, APR values do
      if (entry.name === 'ROI') {
        return value
      }
      return `${value}%`
    }

    return (
      <div style={{
        backgroundColor: 'var(--vocs-color-background)',
        border: '1px solid var(--vocs-color-border)',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}>
        <p style={{ fontSize: '12px', color: 'var(--vocs-color-text2)', marginBottom: '8px' }}>{label}</p>
        {validPayload.map((entry: any, index: number) => (
          <p key={index} style={{ fontSize: '14px', color: entry.color, marginBottom: '4px' }}>
            {entry.name}: {formatValue(entry)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// Filter data by time range and recalculate APR based on the full period
const filterByTimeRange = (data: AssetDataPoint[], days: number): AssetDataPoint[] => {
  if (!data || data.length === 0) return []

  const now = new Date()
  const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  // Filter to only include data within the time range
  const filtered = data.filter((point) => new Date(point.timestamp) >= cutoffDate)

  if (filtered.length < 2) return filtered

  // Get the start price and date for the filtered period
  const startPrice = filtered[0].price
  const startDate = new Date(filtered[0].timestamp)

  // Recalculate APR based on return from start of filtered period
  return filtered.map((point) => {
    const currDate = new Date(point.timestamp)
    const currPrice = point.price
    const daysElapsed = Math.max(1, (currDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    let rate = 0
    if (startPrice > 0 && daysElapsed > 0) {
      const totalReturn = (currPrice - startPrice) / startPrice
      // Annualize the return: APR = (total return / days elapsed) * 365 * 100
      rate = (totalReturn / daysElapsed) * 365 * 100
      // Clamp to reasonable bounds
      rate = Math.max(-15, Math.min(30, rate))
    }

    return { ...point, rate }
  })
}

export function AssetDashboard() {
  const [rawAssetData, setRawAssetData] = useState<AssetData>({})
  const [selectedAsset, setSelectedAsset] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<number>(30)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLiveData, setIsLiveData] = useState<boolean>(false)

  // Load raw data once
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const data: AssetData = {}
      let hasLiveData = false

      // Try to fetch from Dune API
      for (const [assetKey, queryId] of Object.entries(DUNE_QUERIES)) {
        const duneRows = await fetchDuneData(queryId)

        if (duneRows.length > 0) {
          data[assetKey] = transformDuneData(duneRows, assetKey)
          hasLiveData = true
        } else {
          // Fallback to mock data
          const config = ASSETS[assetKey as keyof typeof ASSETS]
          data[assetKey] = generateMockData(config.basePrice, config.baseRate, 365)
        }
      }

      setRawAssetData(data)
      setIsLiveData(hasLiveData)
      setIsLoading(false)
    }

    loadData()
  }, [])

  // Filter data based on selected time range
  const assetData = React.useMemo(() => {
    const filtered: AssetData = {}
    for (const [key, data] of Object.entries(rawAssetData)) {
      filtered[key] = filterByTimeRange(data, timeRange)
    }
    return filtered
  }, [rawAssetData, timeRange])

  // Get latest values for summary cards
  const getLatestValue = (asset: string, field: keyof AssetDataPoint) => {
    const data = assetData[asset]
    if (!data || data.length === 0) return 0
    return data[data.length - 1][field]
  }

  // Prepare data for combined yield chart - align by date
  const prepareYieldChartData = () => {
    // Collect all unique timestamps across all assets
    const allTimestamps = new Set<string>()
    Object.values(assetData).forEach((data) => {
      data.forEach((point) => allTimestamps.add(point.timestamp))
    })

    // Sort timestamps chronologically
    const sortedTimestamps = Array.from(allTimestamps).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    )

    // Create lookup maps for each asset
    const lookups: Record<string, Record<string, number>> = {}
    for (const [key, data] of Object.entries(assetData)) {
      lookups[key] = {}
      data.forEach((point) => {
        lookups[key][point.timestamp] = point.rate
      })
    }

    // Build aligned data
    return sortedTimestamps.map((timestamp) => ({
      timestamp,
      SPKCC: lookups.SPKCC?.[timestamp] ?? null,
      eurSPKCC: lookups.eurSPKCC?.[timestamp] ?? null,
      USCC: lookups.USCC?.[timestamp] ?? null,
    }))
  }

  // Prepare data for ROI chart of a specific asset (base 100)
  const prepareROIChartData = (asset: string) => {
    const data = assetData[asset] || []
    if (data.length === 0) return []

    // Get the first price as the base
    const basePrice = data[0].price
    if (!basePrice || basePrice === 0) return []

    // Convert prices to ROI base 100
    return data.map(point => ({
      ...point,
      roi: (point.price / basePrice) * 100
    }))
  }

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading data...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h1 style={{ ...styles.title, marginBottom: 0 }}>Asset Dashboard</h1>
          <span style={{
            ...styles.apiStatus,
            ...(isLiveData ? styles.apiLive : styles.apiMock),
          }}>
            {isLiveData ? '● Live Data' : '● Mock Data'}
          </span>
        </div>
        <p style={styles.subtitle}>Real-time yield and price data for SPKCC, eurSPKCC, and USCC</p>
      </div>

      {/* Time Range Selector */}
      <div style={styles.tabContainer}>
        {[14, 30, 90].map((days) => (
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
              <ReferenceArea y1={-100} y2={0} fill="rgba(239, 68, 68, 0.15)" strokeOpacity={0} />
              <ReferenceLine y={0} stroke="rgba(239, 68, 68, 0.5)" strokeWidth={1} />
              <XAxis
                dataKey="timestamp"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
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
                  connectNulls={true}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Individual ROI Charts (Base 100) */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>ROI Charts by Asset (Base 100)</h2>

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

        {/* ROI Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedAsset === 'all' ? 'repeat(auto-fit, minmax(400px, 1fr))' : '1fr', gap: '24px' }}>
          {(selectedAsset === 'all' ? Object.keys(ASSETS) : [selectedAsset]).map((assetKey) => {
            const config = ASSETS[assetKey as keyof typeof ASSETS]
            const data = prepareROIChartData(assetKey)

            return (
              <div key={assetKey} style={styles.chartContainer}>
                <h3 style={styles.chartTitle}>{config.name} ROI (Base 100)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`gradient-${assetKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--vocs-color-border)" />
                    <ReferenceLine y={100} stroke="rgba(156, 163, 175, 0.5)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value)
                        return `${date.getMonth() + 1}/${date.getDate()}`
                      }}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      domain={['auto', 'auto']}
                      tickFormatter={(value) => value.toFixed(1)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="roi"
                      name="ROI"
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
          Data source: Dune Analytics queries (SPKCC: 6603491, eurSPKCC: 6598168, USCC: 6603571).
          {!isLiveData && ' Unable to fetch live data from Dune Analytics.'}
        </p>
      </div>
    </div>
  )
}

export default AssetDashboard
