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

// 서버 메모리 캐시
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

    // Daum 증권 검색 API (종목명 부분매칭 지원, ETF 포함)
    const url = `https://finance.daum.net/api/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://finance.daum.net/',
        'Origin': 'https://finance.daum.net',
        'X-Requested-With': 'XMLHttpRequest',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Daum API 오류: ${response.status}`);
    }

    const data = await response.json();
    const results: { name: string; code: string; market: string }[] = [];

    for (const item of (data.suggestItems || [])) {
      const code = (item.displayedCode || item.symbolCode || '').replace(/^[AQ]/, '');
      const name = item.koreanName || '';
      if (!code || !name) continue;

      // 6자리 숫자 코드만 (ETN 등 제외)
      if (!/^\d{6}$/.test(code)) continue;

      results.push({ name, code, market: '' });
    }

    const payload = { results };

    // 캐시 저장
    cache.set(query, { data: payload, ts: Date.now() });
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
