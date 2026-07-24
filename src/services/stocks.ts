// ─── Mock stock-data service ─────────────────────────────────────────────────
// Structured so a real provider (Alpha Vantage, Finnhub, Polygon…) can replace
// this module without touching UI code. See services/api.ts for the seam.
import { format, subDays } from 'date-fns'
import { round2 } from '@/lib/format'

export interface StockQuote {
  ticker: string
  name: string
  price: number
  change: number
  changePct: number
  open: number
  previousClose: number
  dayLow: number
  dayHigh: number
  week52Low: number
  week52High: number
  volume: number
  avgVolume: number
  marketCap: number
  exchange: string
  sector: string
  industry: string
  description: string
}

export interface PricePoint {
  date: string
  price: number
}

interface StockSeed {
  ticker: string; name: string; base: number; sector: string; industry: string; exchange: string; capB: number; desc: string
}

const SEEDS: StockSeed[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', base: 214.2, sector: 'Technology', industry: 'Consumer Electronics', exchange: 'NASDAQ', capB: 3210, desc: 'Apple designs and sells smartphones, personal computers, tablets, wearables, and accessories, and operates a growing services business.' },
  { ticker: 'MSFT', name: 'Microsoft Corp.', base: 448.6, sector: 'Technology', industry: 'Software — Infrastructure', exchange: 'NASDAQ', capB: 3330, desc: 'Microsoft develops cloud, productivity, and business software, including Azure, Microsoft 365, and Windows.' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', base: 131.9, sector: 'Technology', industry: 'Semiconductors', exchange: 'NASDAQ', capB: 3240, desc: 'NVIDIA designs GPUs and accelerated-computing platforms for gaming, data centers, and AI workloads.' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', base: 193.4, sector: 'Consumer Discretionary', industry: 'Internet Retail', exchange: 'NASDAQ', capB: 2010, desc: 'Amazon operates e-commerce marketplaces, the AWS cloud platform, and digital media services.' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', base: 178.3, sector: 'Communication Services', industry: 'Internet Content', exchange: 'NASDAQ', capB: 2200, desc: 'Alphabet is the parent company of Google, spanning Search, YouTube, Android, and Google Cloud.' },
  { ticker: 'META', name: 'Meta Platforms Inc.', base: 512.7, sector: 'Communication Services', industry: 'Social Media', exchange: 'NASDAQ', capB: 1300, desc: 'Meta builds social and messaging products including Facebook, Instagram, and WhatsApp.' },
  { ticker: 'TSLA', name: 'Tesla Inc.', base: 246.8, sector: 'Consumer Discretionary', industry: 'Auto Manufacturers', exchange: 'NASDAQ', capB: 785, desc: 'Tesla designs and manufactures electric vehicles, energy storage, and solar products.' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', base: 212.5, sector: 'Financials', industry: 'Banks — Diversified', exchange: 'NYSE', capB: 610, desc: 'JPMorgan Chase is a global financial-services firm offering consumer, commercial, and investment banking.' },
  { ticker: 'V', name: 'Visa Inc.', base: 279.9, sector: 'Financials', industry: 'Credit Services', exchange: 'NYSE', capB: 560, desc: 'Visa operates one of the world’s largest electronic payments networks.' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', base: 152.3, sector: 'Healthcare', industry: 'Drug Manufacturers', exchange: 'NYSE', capB: 366, desc: 'Johnson & Johnson develops pharmaceuticals and medical technologies.' },
  { ticker: 'XOM', name: 'Exxon Mobil Corp.', base: 118.7, sector: 'Energy', industry: 'Oil & Gas Integrated', exchange: 'NYSE', capB: 525, desc: 'Exxon Mobil explores for and produces crude oil and natural gas, and manufactures petroleum products.' },
  { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', base: 268.4, sector: 'Fund', industry: 'Index ETF', exchange: 'NYSE Arca', capB: 440, desc: 'VTI tracks the CRSP US Total Market Index, covering essentially the entire investable U.S. equity market.' },
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', base: 512.1, sector: 'Fund', industry: 'Index ETF', exchange: 'NYSE Arca', capB: 1360, desc: 'VOO tracks the S&P 500 Index of large-cap U.S. companies.' },
  { ticker: 'COST', name: 'Costco Wholesale Corp.', base: 884.2, sector: 'Consumer Staples', industry: 'Discount Stores', exchange: 'NASDAQ', capB: 392, desc: 'Costco operates membership warehouse clubs offering merchandise at low prices.' },
  { ticker: 'HD', name: 'Home Depot Inc.', base: 352.6, sector: 'Consumer Discretionary', industry: 'Home Improvement', exchange: 'NYSE', capB: 350, desc: 'Home Depot is the largest home-improvement retailer in the United States.' },
  { ticker: 'NFLX', name: 'Netflix Inc.', base: 684.5, sector: 'Communication Services', industry: 'Streaming', exchange: 'NASDAQ', capB: 294, desc: 'Netflix provides subscription streaming of films and television series.' },
  { ticker: 'DIS', name: 'Walt Disney Co.', base: 98.4, sector: 'Communication Services', industry: 'Entertainment', exchange: 'NYSE', capB: 179, desc: 'Disney operates media networks, theme parks, and streaming services including Disney+.' },
  { ticker: 'PFE', name: 'Pfizer Inc.', base: 27.9, sector: 'Healthcare', industry: 'Drug Manufacturers', exchange: 'NYSE', capB: 158, desc: 'Pfizer discovers, develops, and manufactures biopharmaceutical products.' },
  { ticker: 'KO', name: 'Coca-Cola Co.', base: 68.2, sector: 'Consumer Staples', industry: 'Beverages', exchange: 'NYSE', capB: 294, desc: 'Coca-Cola manufactures and markets nonalcoholic beverages worldwide.' },
  { ticker: 'PLTR', name: 'Palantir Technologies', base: 29.6, sector: 'Technology', industry: 'Software — Application', exchange: 'NASDAQ', capB: 66, desc: 'Palantir builds data-integration and analytics platforms for government and commercial customers.' },
]

function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function randFor(ticker: string, salt: number): number {
  let h = hash(ticker) + salt * 2654435761
  h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

export function getQuote(ticker: string): StockQuote | null {
  const seed = SEEDS.find((s) => s.ticker === ticker.toUpperCase())
  if (!seed) return null
  const daySalt = Math.floor(Date.now() / 86400000)
  const drift = (randFor(seed.ticker, daySalt) - 0.48) * 0.05
  const price = round2(seed.base * (1 + drift))
  const previousClose = round2(seed.base * (1 + drift * 0.4))
  const change = round2(price - previousClose)
  const changePct = round2((change / previousClose) * 100)
  const open = round2(previousClose * (1 + (randFor(seed.ticker, daySalt + 1) - 0.5) * 0.01))
  const dayLow = round2(Math.min(open, price) * (1 - randFor(seed.ticker, daySalt + 2) * 0.008))
  const dayHigh = round2(Math.max(open, price) * (1 + randFor(seed.ticker, daySalt + 3) * 0.008))
  const volume = Math.floor(2_000_000 + randFor(seed.ticker, daySalt + 4) * 40_000_000)
  return {
    ticker: seed.ticker, name: seed.name, price, change, changePct, open, previousClose,
    dayLow, dayHigh,
    week52Low: round2(seed.base * 0.72), week52High: round2(seed.base * 1.18),
    volume, avgVolume: Math.floor(volume * 1.12),
    marketCap: Math.floor(seed.capB * 1e9),
    exchange: seed.exchange, sector: seed.sector, industry: seed.industry, description: seed.desc,
  }
}

export function getHistory(ticker: string, range: '1D' | '5D' | '1M' | '6M' | '1Y' | '5Y'): PricePoint[] {
  const quote = getQuote(ticker)
  if (!quote) return []
  const days = range === '1D' ? 1 : range === '5D' ? 5 : range === '1M' ? 30 : range === '6M' ? 182 : range === '1Y' ? 365 : 1825
  const points: PricePoint[] = []
  const volatility = range === '1D' ? 0.004 : 0.016
  let price = quote.price
  const arr: number[] = []
  for (let i = days; i >= 0; i--) {
    const r = randFor(ticker.toUpperCase(), i * 7919)
    price = round2(price * (1 + (r - 0.492) * volatility))
    arr.push(price)
  }
  arr.reverse()
  for (let i = 0; i < arr.length; i++) {
    points.push({ date: format(subDays(new Date(), days - i), 'yyyy-MM-dd'), price: arr[i] })
  }
  // Ensure latest point equals current price
  if (points.length) points[points.length - 1].price = quote.price
  return points
}

export function searchStocks(query: string): StockQuote[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return SEEDS.filter((s) => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    .slice(0, 8)
    .map((s) => getQuote(s.ticker)!)
}

export function allTickers(): string[] {
  return SEEDS.map((s) => s.ticker)
}
