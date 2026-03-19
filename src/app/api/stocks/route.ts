import { NextResponse } from 'next/server';

interface StockItem {
  name: string;
  code: string;
  market: string;
}

// 서버 메모리 캐시
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

async function fetchFromKRX(): Promise<StockItem[]> {
  // KRX 전종목 기본정보 API (KOSPI + KOSDAQ 한 번에)
  const body = new URLSearchParams({
    bld: 'dbms/MDC/STAT/standard/MDCSTAT01901',
    locale: 'ko_KR',
    mktId: 'ALL',
    share: '1',
    csvxls_isNo: 'false',
  });

  const response = await fetch('https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd', {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Referer': 'https://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd?menuId=MDC0201020101',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': 'https://data.krx.co.kr',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`KRX: ${response.status}`);
  const data = await response.json();

  return (data.OutBlock_1 || []).map((item: Record<string, string>) => ({
    name: item.ISU_ABBRV || '',
    code: item.ISU_SRT_CD || '',
    market: item.MKT_NM === '코스닥' || item.MKT_NM === 'KOSDAQ' ? 'KOSDAQ' : 'KOSPI',
  })).filter((s: StockItem) => s.name && s.code && /^\d{6}$/.test(s.code));
}

async function fetchFromNaverBulk(): Promise<StockItem[]> {
  // Naver 초성/알파벳별 수집 (fallback)
  const queries = [
    ...['가','나','다','라','마','바','사','아','자','차','카','타','파','하'],
    ...['강','건','경','계','고','공','광','구','국','금','기'],
    ...['남','녹','농','누','뉴'],
    ...['대','더','데','도','동','두','디'],
    ...['라이','러','레','로','롯','루','리'],
    ...['만','매','메','모','무','미'],
    ...['백','범','보','부','비'],
    ...['삼','상','서','선','성','세','소','솔','수','스','시','신'],
    ...['에','엔','엘','영','오','우','원','유','은','이','인','일'],
    ...['제','조','지','진'],
    ...['카카','케','코','크','큐','키'],
    ...['태','텔','토','티'],
    ...['파라','팜','포','풀','피'],
    ...['한','해','현','호','화','효','휴'],
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  ];

  const batchSize = 10;
  const stockMap = new Map<string, StockItem>();

  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(async (q) => {
      try {
        const url = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(q)}&target=stock`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://stock.naver.com/',
          },
          cache: 'no-store',
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.items || [])
          .filter((item: Record<string, string>) => item.category === 'stock')
          .map((item: Record<string, string>) => ({
            name: item.name || '',
            code: (item.code || '').replace(/^A/, ''),
            market: (item.typeCode || '').toUpperCase().includes('KOSDAQ') ? 'KOSDAQ' : 'KOSPI',
          }))
          .filter((s: StockItem) => s.name && s.code);
      } catch { return []; }
    }));

    for (const list of results) {
      for (const s of list) {
        if (!stockMap.has(s.code)) stockMap.set(s.code, s);
      }
    }
  }

  return Array.from(stockMap.values());
}

async function getAllStocks(): Promise<StockItem[]> {
  if (cachedStocks && Date.now() - cacheTime < CACHE_TTL) {
    return cachedStocks;
  }

  // 방법 1: KRX 전종목
  try {
    const stocks = await fetchFromKRX();
    if (stocks.length > 100) {
      cachedStocks = stocks;
      cacheTime = Date.now();
      return cachedStocks;
    }
  } catch (e) {
    console.error('KRX fetch failed:', e);
  }

  // 방법 2: Naver 대량 수집
  const stocks = await fetchFromNaverBulk();
  if (stocks.length > 0) {
    cachedStocks = stocks;
    cacheTime = Date.now();
    return cachedStocks;
  }

  throw new Error('모든 데이터 소스에서 종목 리스트를 가져오지 못했습니다.');
}

export async function GET() {
  try {
    const stocks = await getAllStocks();

    const res = setCors(NextResponse.json({
      stocks,
      count: stocks.length,
    }));
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
