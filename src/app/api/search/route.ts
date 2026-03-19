import { NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query) {
      const res = NextResponse.json({ results: [] });
      Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    const url = `https://finance.daum.net/api/search/ac?q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Referer': 'https://finance.daum.net/',
        'Origin': 'https://finance.daum.net',
        'X-Requested-With': 'XMLHttpRequest',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Daum Search API 오류: ${response.status}`);
    }

    const data = await response.json();

    // Daum autocomplete API returns data in various formats
    // Extract stock items from the response
    const results: { name: string; code: string; market: string }[] = [];

    if (data.data) {
      const items = data.data;
      for (const item of items) {
        // Only include Korean stocks (KOSPI, KOSDAQ)
        if (item.symbolCode && (item.market === 'KOSPI' || item.market === 'KOSDAQ' || item.market === 'KONEX')) {
          results.push({
            name: item.name || item.korName || '',
            code: item.symbolCode.replace(/^A/, ''),
            market: item.market,
          });
        }
      }
    }

    const res = NextResponse.json({ results });
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (error: any) {
    console.error('검색 API 호출 실패:', error);
    const res = NextResponse.json(
      { error: '검색에 실패했습니다.', details: error.message, results: [] },
      { status: 500 }
    );
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
}
