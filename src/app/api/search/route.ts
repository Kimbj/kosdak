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

    const url = `https://m.stock.naver.com/api/search/ac?keyword=${encodeURIComponent(query)}&target=stock`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Naver Search API 오류: ${response.status}`);
    }

    const data = await response.json();

    const results: { name: string; code: string; market: string }[] = [];

    // Naver stock search API response: { stocks: [...] } or { result: { stock: [...] } }
    const items = data.stocks || data.result?.stocks || data.result?.stock || [];

    for (const item of items) {
      const code = item.code || item.itemCode || item.reutersCode?.replace('.KS', '').replace('.KQ', '') || '';
      const name = item.name || item.stockName || item.korName || '';
      const marketName = item.market || item.stockExchangeType?.name || '';

      // 국내 주식만 필터링
      const marketUpper = (typeof marketName === 'string' ? marketName : '').toUpperCase();
      if (code && name && (marketUpper.includes('KOSPI') || marketUpper.includes('KOSDAQ') || marketUpper.includes('KONEX') || marketUpper === 'STOCK' || marketUpper === '')) {
        let displayMarket = 'KOSPI';
        if (marketUpper.includes('KOSDAQ')) displayMarket = 'KOSDAQ';
        else if (marketUpper.includes('KONEX')) displayMarket = 'KONEX';
        else if (item.stockExchangeType?.code === 'KOSDAQ') displayMarket = 'KOSDAQ';

        results.push({
          name,
          code: code.replace(/^A/, ''),
          market: displayMarket,
        });
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
