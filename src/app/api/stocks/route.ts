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

async function fetchNaverMarketStocks(market: 'KOSPI' | 'KOSDAQ'): Promise<StockItem[]> {
  // Naver 증권 전종목 시세 페이지 API (페이지네이션)
  const sosok = market === 'KOSPI' ? '0' : '1';
  const stocks: StockItem[] = [];
  let page = 1;

  while (true) {
    const url = `https://m.stock.naver.com/api/stocks/marketValue/${market}?page=${page}&pageSize=100`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) break;
    const data = await res.json();
    const items = data.stocks || [];
    if (items.length === 0) break;

    for (const item of items) {
      const code = (item.stockCode || item.itemCode || item.code || '').replace(/^A/, '');
      const name = item.stockName || item.itemName || item.name || '';
      if (code && name && /^\d{6}$/.test(code)) {
        stocks.push({ name, code, market });
      }
    }

    if (!data.hasNext && items.length < 100) break;
    page++;
    if (page > 50) break; // 안전장치
  }

  return stocks;
}

async function fetchNaverStockList(market: 'KOSPI' | 'KOSDAQ'): Promise<StockItem[]> {
  // Naver 증권 전종목 리스트 (금융 데이터)
  const sosok = market === 'KOSPI' ? '0' : '1';
  const stocks: StockItem[] = [];
  let page = 1;

  while (true) {
    const url = `https://finance.naver.com/sise/sise_market_sum.naver?sosok=${sosok}&page=${page}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    });

    if (!res.ok) break;
    const html = await res.text();

    // HTML에서 종목코드와 이름 추출
    const regex = /\/item\/main\.naver\?code=(\d{6})[^>]*>([^<]+)</g;
    let match;
    let found = 0;
    while ((match = regex.exec(html)) !== null) {
      const code = match[1];
      const name = match[2].trim();
      if (code && name) {
        stocks.push({ name, code, market });
        found++;
      }
    }

    if (found === 0) break;
    page++;
    if (page > 50) break;
  }

  return stocks;
}

async function fetchFromNaverAC(): Promise<StockItem[]> {
  // Naver 자동완성 fallback (가장 마지막 수단)
  const queries = [
    ...['가','각','간','갈','감','강','개','거','건','검','게','겔','경','계','고','곡','골','공','과','관','광','교','구','국','군','굿','궁','권','글','금','기','긴','길','김'],
    ...['나','남','내','넥','네이','녹','농','놀','누','뉴','니'],
    ...['다','단','달','담','대','더','덕','데','도','동','두','드','디'],
    ...['라','라이','라인','락','란','랜','러','레','로','록','롤','롯','루','류','르','리','린'],
    ...['마','만','말','매','맥','머','메','멜','명','모','목','무','문','물','미','민','밀'],
    ...['바','박','반','발','방','배','백','버','범','베','벡','벨','병','보','복','봉','부','북','비','빅','빌','빛'],
    ...['사','삼','상','새','샘','생','서','석','선','설','성','세','셀','소','솔','송','수','숙','순','슈','스','슬','시','신','실','싸','쌍'],
    ...['아','안','알','암','애','앤','앱','야','양','어','에','엑','엔','엘','엠','여','연','영','예','오','옥','온','올','와','완','왕','외','요','용','우','운','울','원','웅','웰','웹','위','유','율','윤','은','을','음','의','이','인','일','잇','잉'],
    ...['자','잔','잡','장','재','저','전','절','점','정','제','조','종','주','중','즐','지','진','질'],
    ...['차','참','창','채','천','첨','청','체','초','총','추','충','치','칩'],
    ...['카','카카','칸','캐','캔','커','컬','컴','케','켐','코','콘','콜','콤','쿠','퀀','퀄','큐','크','클','키','킨','킴'],
    ...['타','탄','태','택','터','테','텍','텔','토','톱','통','투','트','특','티'],
    ...['파','판','팜','패','팩','퍼','페','펄','펜','펫','평','포','폴','표','푸','풀','풍','프','피','핀','필','핏'],
    ...['하','한','할','함','합','항','해','핵','햇','행','향','허','헌','헬','현','형','혜','호','홈','홍','화','환','황','효','후','훈','휘','휴','흥','희','히'],
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').flatMap(c => [c, c+'A', c+'E', c+'I', c+'O', c+'U', c+'R', c+'S', c+'T', c+'N']),
    ...'0123456789'.split(''),
  ];

  const batchSize = 15;
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

  // 방법 1: Naver 증권 시가총액 페이지 파싱
  try {
    const [kospi, kosdaq] = await Promise.all([
      fetchNaverStockList('KOSPI'),
      fetchNaverStockList('KOSDAQ'),
    ]);
    if (kospi.length + kosdaq.length > 500) {
      cachedStocks = [...kospi, ...kosdaq];
      cacheTime = Date.now();
      return cachedStocks;
    }
  } catch (e) {
    console.error('Naver stock list failed:', e);
  }

  // 방법 2: Naver 자동완성 대량 수집
  const stocks = await fetchFromNaverAC();
  if (stocks.length > 0) {
    cachedStocks = stocks;
    cacheTime = Date.now();
    return cachedStocks;
  }

  throw new Error('종목 리스트를 가져오지 못했습니다.');
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
