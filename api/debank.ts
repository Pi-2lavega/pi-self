import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { endpoint, address, apiKey } = req.query

  if (!endpoint || !address || !apiKey) {
    return res.status(400).json({ error: 'Missing required parameters: endpoint, address, apiKey' })
  }

  const validEndpoints = ['total_balance', 'all_token_list', 'all_complex_protocol_list']
  if (!validEndpoints.includes(endpoint as string)) {
    return res.status(400).json({ error: 'Invalid endpoint' })
  }

  let url = `https://pro-openapi.debank.com/v1/user/${endpoint}?id=${address}`
  if (endpoint === 'all_token_list') {
    url += '&is_all=true'
  }

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        AccessKey: apiKey as string,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return res.status(response.status).json({ error: errorText })
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
