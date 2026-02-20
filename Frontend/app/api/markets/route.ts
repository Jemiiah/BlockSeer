import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_DEV_MODE === 'true'
  ? 'http://localhost:3001'
  : 'https://blockseer.onrender.com';

const MAX_RETRIES = 2;
const RETRY_DELAY = 1500; // ms
const CACHE_TTL = 60_000; // 60s

// In-memory cache
let cachedData: { data: unknown; timestamp: number } | null = null;

async function fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(15000),
      });
      return response;
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      console.warn(`Proxy attempt ${attempt + 1} failed, retrying in ${RETRY_DELAY}ms...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }
  }
  throw new Error('Max retries exceeded');
}

function isCacheFresh(): boolean {
  return !!cachedData && Date.now() - cachedData.timestamp < CACHE_TTL;
}

async function refreshCacheInBackground() {
  try {
    const response = await fetchWithRetry(`${BACKEND_URL}/markets`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      cachedData = { data, timestamp: Date.now() };
    }
  } catch (error) {
    console.error('Background cache refresh failed:', error);
  }
}

export async function GET() {
  // Serve from cache if fresh
  if (isCacheFresh()) {
    return NextResponse.json(cachedData!.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Cache': 'HIT',
      },
    });
  }

  // If stale cache exists, serve it immediately and refresh in background
  if (cachedData) {
    refreshCacheInBackground();
    return NextResponse.json(cachedData.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Cache': 'STALE',
      },
    });
  }

  // No cache — fetch synchronously
  try {
    const response = await fetchWithRetry(`${BACKEND_URL}/markets`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    cachedData = { data, timestamp: Date.now() };

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetchWithRetry(`${BACKEND_URL}/markets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Invalidate cache on new market creation
    cachedData = null;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Failed to create market' }, { status: 502 });
  }
}
