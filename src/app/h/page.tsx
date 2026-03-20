'use client';

import { useEffect, useState } from 'react';

interface QuoteItem {
  name: string;
  code: string;
  price: number;
  change: number;
  changePercent: number;
}

interface QuoteData {
  items: QuoteItem[];
  updatedAt: string;
}

export default function Home() {
  const [data, setData] = useState<QuoteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = async () => {
    try {
      const query = typeof window !== 'undefined' ? window.location.search : '';
      const res = await fetch(`/api/quote${query}`);
      if (!res.ok) throw new Error('서버 통신 지연');
      
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setData(json);
      setError(null);
    } catch (err: any) {
      if (!data) setError('데이터 연동 중...');
    }
  };

  useEffect(() => {
    fetchQuote();
    const interval = setInterval(fetchQuote, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ fontSize: '13px', color: '#fff', backgroundColor: '#fff', padding: '10px', overflow: 'hidden', minHeight: '100vh' }}>
      <h3 style={{ fontSize: '15px', margin: '0 0 10px 0', fontWeight: 'normal' }}>업무 참조용 지표 데이터</h3>
      
      {error && !data ? (
        <div>{error}</div>
      ) : data ? (
        <div>
          <table cellPadding={4} style={{ borderCollapse: 'collapse', width: '400px', textAlign: 'right', border: '1px solid #fff' }}>
            <thead>
              <tr style={{ backgroundColor: '#fff', textAlign: 'center' }}>
                <th style={{ border: '1px solid #fff' }}>구분</th>
                <th style={{ border: '1px solid #fff' }}>지표명</th>
                <th style={{ border: '1px solid #fff' }}>현재치</th>
                <th style={{ border: '1px solid #fff' }}>변동액</th>
                <th style={{ border: '1px solid #fff' }}>변동률</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => {
                // 정확한 보합(0) 처리를 위해 소수점 버림값 등 예외 처리
                const isZero = item.change === 0 || Math.abs(item.change) < 0.001;
                
                // 부호 텍스트: 보합이면 아예 기호를 빼거나 '-' 하나만 표시
                const signText = isZero ? "" : item.change > 0 ? "▲" : "▼";
                
                // 등락률 텍스트: 보합이면 0.00%
                const percentText = isZero 
                  ? "0.00%" 
                  : `${item.changePercent > 0 ? '+' : ''}${item.changePercent.toFixed(2)}%`;

                return (
                  <tr key={item.code}>
                    <td style={{ textAlign: 'center', border: '1px solid #fff' }}>{index + 1}</td>
                    <td style={{ textAlign: 'left', border: '1px solid #fff' }}>{item.name}</td>
                    <td style={{ border: '1px solid #fff' }}>{item.price.toLocaleString()}</td>
                    <td style={{ border: '1px solid #fff' }}>{signText} {Math.abs(item.change).toLocaleString()}</td>
                    <td style={{ border: '1px solid #fff' }}>{percentText}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: '5px', color: '#fff', fontSize: '12px' }}>
            갱신시각: {data.updatedAt}
          </div>
        </div>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
}
