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

export default function Landing() {
  const [data, setData] = useState<QuoteData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/quote');
        if (res.ok) {
          const json = await res.json();
          if (!json.error) setData(json);
        }
      } catch {}
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      fontFamily: "'Malgun Gothic', 'Noto Sans KR', sans-serif",
      margin: 0,
      padding: 0,
      backgroundColor: '#f8f9fa',
      color: '#333',
      minHeight: '100vh',
    }}>
      {/* 헤더 */}
      <header style={{
        backgroundColor: '#1a2332',
        color: '#fff',
        padding: '40px 20px',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '28px', margin: '0 0 10px 0', fontWeight: 700 }}>
          KOSDAK - 코스닥 실시간 시세
        </h1>
        <p style={{ fontSize: '16px', margin: 0, color: '#adb5bd' }}>
          코스닥 ETF 실시간 시세를 간편하게 확인하세요
        </p>
      </header>

      {/* 실시간 시세 섹션 */}
      <section style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '15px', color: '#1a2332' }}>
          실시간 시세
        </h2>
        {data ? (
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}>
              <thead>
                <tr style={{ backgroundColor: '#1a2332', color: '#fff' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>구분</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>지표명</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>현재가</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>변동</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>등락률</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => {
                  const isZero = item.change === 0 || Math.abs(item.change) < 0.001;
                  const changeColor = isZero ? '#333' : item.change > 0 ? '#d63031' : '#0984e3';
                  const signText = isZero ? '' : item.change > 0 ? '▲' : '▼';
                  const percentText = isZero
                    ? '0.00%'
                    : `${item.changePercent > 0 ? '+' : ''}${item.changePercent.toFixed(2)}%`;

                  return (
                    <tr key={item.code} style={{
                      borderBottom: '1px solid #eee',
                      backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                    }}>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#666' }}>{index + 1}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{item.price.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: changeColor, fontWeight: 600 }}>
                        {signText} {Math.abs(item.change).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: changeColor, fontWeight: 600 }}>
                        {percentText}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '10px 16px', fontSize: '12px', color: '#999', textAlign: 'right' }}>
              갱신시각: {data.updatedAt}
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            color: '#999',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            시세 정보를 불러오는 중...
          </div>
        )}
      </section>

      {/* 서비스 소개 */}
      <section style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '15px', color: '#1a2332' }}>
          서비스 소개
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {[
            { title: '실시간 시세', desc: '코스닥 ETF 시세를 실시간으로 확인할 수 있습니다. 5초마다 자동 갱신됩니다.' },
            { title: '간편한 조회', desc: '종목 코드만 입력하면 원하는 종목의 시세를 바로 확인할 수 있습니다.' },
            { title: '무료 서비스', desc: '별도의 회원가입 없이 누구나 무료로 이용할 수 있습니다.' },
          ].map((card) => (
            <div key={card.title} style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
              <h3 style={{ fontSize: '16px', margin: '0 0 8px 0', color: '#1a2332' }}>{card.title}</h3>
              <p style={{ fontSize: '14px', margin: 0, color: '#666', lineHeight: '1.6' }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 사용 방법 */}
      <section style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '15px', color: '#1a2332' }}>
          사용 방법
        </h2>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontSize: '14px',
          lineHeight: '2',
          color: '#555',
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>기본 시세 조회:</strong> 페이지에 접속하면 주요 코스닥 ETF 시세가 자동으로 표시됩니다.
          </p>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>특정 종목 조회:</strong> URL에 종목코드를 추가하여 원하는 종목을 조회할 수 있습니다.
          </p>
          <p style={{ margin: '0 0 8px 0', fontFamily: 'monospace', backgroundColor: '#f1f3f5', padding: '8px 12px', borderRadius: '4px' }}>
            예시: kosdak.vercel.app/h?codes=005930,000660
          </p>
          <p style={{ margin: 0 }}>
            <strong>자동 갱신:</strong> 시세 데이터는 주기적으로 자동 갱신되어 항상 최신 정보를 제공합니다.
          </p>
        </div>
      </section>

      {/* 푸터 */}
      <footer style={{
        textAlign: 'center',
        padding: '30px 20px',
        color: '#999',
        fontSize: '12px',
        marginTop: '40px',
      }}>
        <p style={{ margin: 0 }}>KOSDAK &copy; {new Date().getFullYear()} | 투자에 대한 책임은 본인에게 있습니다.</p>
        <p style={{ margin: '5px 0 0 0' }}>데이터 출처: Daum Finance</p>
      </footer>
    </div>
  );
}
