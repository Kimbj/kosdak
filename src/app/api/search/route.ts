import { NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

function setCors(res: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

// 서버 메모리 캐시 (동일 쿼리 재요청 방지)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5분

export async function OPTIONS() {
  return setCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query) {
      return setCors(NextResponse.json({ results: [] }));
    }

    // 캐시 확인
    const cached = cache.get(query);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return setCors(NextResponse.json(cached.data));
    }

    // Naver 증권 자동완성 API (JSON, UTF-8)
    const url = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(query)}&target=stock,etf`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://stock.naver.com/',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Naver API 오류: ${response.status}`);
    }

    const data = await response.json();
    const results: { name: string; code: string; market: string }[] = [];

    const items = data.items || [];
    for (const item of items) {
      if (item.category !== 'stock' && item.category !== 'etf') continue;
      const code = (item.code || '').replace(/^A/, '');
      const name = item.name || '';
      if (!code || !name) continue;

      const typeCode = (item.typeCode || '').toUpperCase();
      let market = 'KOSPI';
      if (typeCode.includes('KOSDAQ')) market = 'KOSDAQ';
      else if (typeCode.includes('KONEX')) market = 'KONEX';

      results.push({ name, code, market });
    }

    const payload = { results };

    // 캐시 저장
    cache.set(query, { data: payload, ts: Date.now() });
    // 오래된 캐시 정리
    if (cache.size > 500) {
      const now = Date.now();
      for (const [key, val] of cache) {
        if (now - val.ts > CACHE_TTL) cache.delete(key);
      }
    }

    return setCors(NextResponse.json(payload));
  } catch (error: any) {
    console.error('검색 API 호출 실패:', error);
    return setCors(NextResponse.json(
      { error: '검색에 실패했습니다.', details: error.message, results: [] },
      { status: 500 }
    ));
  }
}
