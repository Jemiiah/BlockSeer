import { NextResponse } from 'next/server';
import { invalidateMarketCache } from '@/lib/market-cache';

const BACKEND_URL = process.env.NEXT_PUBLIC_DEV_MODE === 'true'
  ? 'http://localhost:3001'
  : 'https://blockseer.onrender.com';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();

    // Invalidate market cache so next fetch gets fresh stakes data
    invalidateMarketCache();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Predictions proxy error:', error);
    return NextResponse.json({ error: 'Failed to report prediction' }, { status: 502 });
  }
}
