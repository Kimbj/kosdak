import { NextResponse } from 'next/server';

// KODEX 코스닥150, KODEX 코스닥150선물인버스
const SYMBOLS = [
  { code: '229200', name: 'KODEX 코스닥150' },
  { code: '251340', name: 'KODEX 코스닥150선물인버스' }
];

async function fetchQuote(symbolCode: string, fallbackName?: string) {
  const url = `https://finance.daum.net/api/quotes/A${symbolCode}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Referer': `https://finance.daum.net/quotes/A${symbolCode}`,
      'Origin': 'https://finance.daum.net',
      'X-Requested-With': 'XMLHttpRequest',
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Daum API 오류: ${response.status}`);
  }

  const data = await response.json();

  // Daum API 응답에서 종목명을 직접 가져옴
  const name = data.name || fallbackName || `종목 ${symbolCode}`;
  const price = data.tradePrice;
  let change = data.changePrice;

  if (data.change === 'FALL') {
    change = -Math.abs(change);
  } else if (data.change === 'RISE') {
    change = Math.abs(change);
  } else {
    change = 0;
  }

  // 어제 종가를 역산하여 등락률을 직접 계산합니다.
  const prevClose = price - change;
  let changePercent = 0;
  if (prevClose > 0) {
    changePercent = (change / prevClose) * 100;
  }

  return {
    name: name,
    code: symbolCode,
    price: price,
    change: change,
    changePercent: Number(changePercent.toFixed(2)),
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codes = searchParams.get('codes');

    let targetSymbols = SYMBOLS;
    if (codes) {
      targetSymbols = codes.split(',').map(code => {
        const trimmedCode = code.trim();
        const found = SYMBOLS.find(s => s.code === trimmedCode);
        return found ? found : { code: trimmedCode, name: `종목 ${trimmedCode}` };
      });
    }

    // 종목 데이터를 병렬로 동시에 가져옵니다.
    const promises = targetSymbols.map(sym => fetchQuote(sym.code, sym.name));
    const results = await Promise.all(promises);

    return NextResponse.json({
      items: results,
      updatedAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    }, { headers: CORS_HEADERS });

  } catch (error: any) {
    console.error('API 호출 실패:', error);
    return NextResponse.json(
      { error: '데이터를 가져오지 못했습니다.', details: error.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
