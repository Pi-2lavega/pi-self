export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { queryId } = req.query

  if (!queryId || typeof queryId !== 'string') {
    return res.status(400).json({ error: 'Missing queryId parameter' })
  }

  const apiKey = process.env.VITE_DUNE_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'Dune API key not configured' })
  }

  try {
    const response = await fetch(`https://api.dune.com/api/v1/query/${queryId}/results`, {
      headers: {
        'X-Dune-API-Key': apiKey,
      },
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: `Dune API error: ${response.status}` })
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching Dune data:', error)
    return res.status(500).json({ error: 'Failed to fetch Dune data' })
  }
}
