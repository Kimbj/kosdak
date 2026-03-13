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
    <div style={{ fontFamily: 'Gulim, Arial, sans-serif', fontSize: '12px', color: '#000', backgroundColor: '#fff', padding: '10px' }}>
      <h3 style={{ fontSize: '14px', margin: '0 0 10px 0', fontWeight: 'normal' }}>업무 참조용 지표 데이터</h3>
      
      {error && !data ? (
        <div>{error}</div>
      ) : data ? (
        <div>
          <table border={1} cellPadding={4} style={{ borderCollapse: 'collapse', width: '400px', textAlign: 'right' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                <th>구분</th>
                <th>지표명</th>
                <th>현재치</th>
                <th>변동액</th>
                <th>변동률</th>
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
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ textAlign: 'left' }}>{item.name}</td>
                    <td>{item.price.toLocaleString()}</td>
                    <td>{signText} {Math.abs(item.change).toLocaleString()}</td>
                    <td>{percentText}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: '5px', color: '#666', fontSize: '11px' }}>
            갱신시각: {data.updatedAt}
          </div>
        </div>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
}
