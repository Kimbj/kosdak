import { NextResponse } from 'next/server';

interface StockItem {
  name: string;
  code: string;
  market: string;
}

// 서버 메모리 캐시 (serverless cold start 시 초기화됨)
let cachedStocks: StockItem[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6시간

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

async function fetchMarket(mktId: string): Promise<StockItem[]> {
  const body = new URLSearchParams({
    bld: 'dbms/MDC/STAT/standard/MDCSTAT01901',
    locale: 'ko_KR',
    mktId,
    share: '1',
    csvxls_isNo: 'false',
  });

  const response = await fetch('http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd', {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': 'http://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd?menuId=MDC0201020101',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`KRX API ${mktId}: ${response.status}`);
  const data = await response.json();

  const market = mktId === 'STK' ? 'KOSPI' : 'KOSDAQ';
  return (data.OutBlock_1 || []).map((item: Record<string, string>) => ({
    name: item.ISU_ABBRV || '',
    code: item.ISU_SRT_CD || '',
    market,
  })).filter((s: StockItem) => s.name && s.code);
}

async function getAllStocks(): Promise<StockItem[]> {
  if (cachedStocks && Date.now() - cacheTime < CACHE_TTL) {
    return cachedStocks;
  }

  const [kospi, kosdaq] = await Promise.all([
    fetchMarket('STK'),
    fetchMarket('KSQ'),
  ]);

  cachedStocks = [...kospi, ...kosdaq];
  cacheTime = Date.now();
  return cachedStocks;
}

export async function GET() {
  try {
    const stocks = await getAllStocks();

    const res = setCors(NextResponse.json({
      stocks,
      count: stocks.length,
      cachedAt: new Date(cacheTime).toISOString(),
    }));
    // 클라이언트 캐시: 1시간
    res.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res;
  } catch (error: any) {
    console.error('종목 리스트 로딩 실패:', error);
    return setCors(NextResponse.json(
      { error: '종목 리스트를 가져오지 못했습니다.', details: error.message, stocks: [] },
      { status: 500 }
    ));
  }
}
