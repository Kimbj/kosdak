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

export async function OPTIONS() {
  return setCors(new NextResponse(null, { status: 204 }));
}

async function tryNaverSearch(query: string) {
  // Naver 증권 자동완성 API
  const url = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(query)}&target=index,stock,marketindicator`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://stock.naver.com/',
    },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`naver ac: ${response.status}`);
  const data = await response.json();
  const results: { name: string; code: string; market: string }[] = [];
  // items 배열 안에 stock 관련 항목들
  const items = data.items || [];
  for (const group of items) {
    const stocks = group.items || [];
    for (const item of stocks) {
      const code = (item.code || '').replace(/^A/, '');
      const name = item.name || '';
      const marketName = (item.marketName || item.market || '').toUpperCase();
      if (code && /^\d{6}$/.test(code)) {
        results.push({
          name,
          code,
          market: marketName.includes('KOSDAQ') ? 'KOSDAQ' : 'KOSPI',
        });
      }
    }
  }
  return results;
}

async function tryDaumSearch(query: string) {
  // Daum 증권 자동완성 API
  const url = `https://finance.daum.net/api/search/ac?q=${encodeURIComponent(query)}`;
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
  if (!response.ok) throw new Error(`daum: ${response.status}`);
  const data = await response.json();
  const results: { name: string; code: string; market: string }[] = [];
  const items = data.data || [];
  for (const item of items) {
    if (item.symbolCode && (item.market === 'KOSPI' || item.market === 'KOSDAQ')) {
      results.push({
        name: item.name || '',
        code: item.symbolCode.replace(/^A/, ''),
        market: item.market,
      });
    }
  }
  return results;
}

async function tryHankyungSearch(query: string) {
  // 한경 자동완성 API
  const url = `https://jstock.hankyung.com/api/v1/search/auto?keyword=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`hankyung: ${response.status}`);
  const data = await response.json();
  const results: { name: string; code: string; market: string }[] = [];
  const items = data.data || data.result || data || [];
  if (Array.isArray(items)) {
    for (const item of items) {
      const code = (item.code || item.symbol || '').replace(/^A/, '');
      const name = item.name || item.stock_name || '';
      if (code && /^\d{6}$/.test(code)) {
        const market = (item.market || item.exchange || '').toUpperCase();
        results.push({
          name,
          code,
          market: market.includes('KOSDAQ') ? 'KOSDAQ' : 'KOSPI',
        });
      }
    }
  }
  return results;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const debug = searchParams.get('debug');

    if (!query) {
      return setCors(NextResponse.json({ results: [] }));
    }

    const errors: string[] = [];

    // 여러 소스를 순서대로 시도
    const strategies = [
      { name: 'naver', fn: () => tryNaverSearch(query) },
      { name: 'daum', fn: () => tryDaumSearch(query) },
      { name: 'hankyung', fn: () => tryHankyungSearch(query) },
    ];

    for (const strategy of strategies) {
      try {
        const results = await strategy.fn();
        if (results.length > 0) {
          const payload: Record<string, unknown> = { results };
          if (debug) payload.source = strategy.name;
          return setCors(NextResponse.json(payload));
        }
        errors.push(`${strategy.name}: 0 results`);
      } catch (e: any) {
        errors.push(`${strategy.name}: ${e.message}`);
      }
    }

    const payload: Record<string, unknown> = { results: [] };
    if (debug) payload.errors = errors;
    return setCors(NextResponse.json(payload));
  } catch (error: any) {
    console.error('검색 API 호출 실패:', error);
    return setCors(NextResponse.json(
      { error: '검색에 실패했습니다.', details: error.message, results: [] },
      { status: 500 }
    ));
  }
}
