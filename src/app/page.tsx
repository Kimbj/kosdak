'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

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

interface SearchResult {
  name: string;
  code: string;
  market: string;
}

export default function Landing() {
  const [data, setData] = useState<QuoteData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedStocks, setSelectedStocks] = useState<SearchResult[]>([]);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeEditorText, setCodeEditorText] = useState('');
  const [copied, setCopied] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.results || []);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addStock = (item: SearchResult) => {
    if (!selectedStocks.find(s => s.code === item.code)) {
      setSelectedStocks(prev => [...prev, item]);
    }
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const removeStock = (code: string) => {
    setSelectedStocks(prev => prev.filter(s => s.code !== code));
  };

  const copyCodeList = async () => {
    const text = selectedStocks.map(s => s.code).join(',');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const openCodeEditor = () => {
    setCodeEditorText(selectedStocks.map(s => s.code).join('\n'));
    setShowCodeEditor(true);
  };

  const saveCodeEditor = () => {
    const codes = codeEditorText
      .split(/[\n,]+/)
      .map(c => c.trim())
      .filter(c => /^\d{6}$/.test(c));
    const unique = [...new Set(codes)];
    setSelectedStocks(unique.map(code => {
      const existing = selectedStocks.find(s => s.code === code);
      return existing || { name: '', code, market: '' };
    }));
    setShowCodeEditor(false);
  };

  const viewQuotes = () => {
    if (selectedStocks.length === 0) return;
    const codes = selectedStocks.map(s => s.code).join(',');
    window.location.href = `/h?codes=${codes}`;
  };

  const btnBase: React.CSSProperties = {
    padding: '8px 16px',
    fontSize: '13px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'opacity 0.15s',
  };

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
          히든 시세
        </h1>
        <p style={{ fontSize: '16px', margin: 0, color: '#adb5bd' }}>
          국내 상장사시세를 간편하게 확인하세요
        </p>
      </header>

      {/* 종목 검색 */}
      <section style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '15px', color: '#1a2332' }}>
          종목 검색
        </h2>
        <div ref={searchRef} style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
            placeholder="종목명을 입력하세요 (예: 삼성전자, 카카오)"
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: '15px',
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
              backgroundColor: '#fff',
            }}
            onFocusCapture={(e) => (e.currentTarget.style.borderColor = '#4a90d9')}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = '#dee2e6')}
          />
          {showResults && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: '#fff',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              zIndex: 100,
              maxHeight: '320px',
              overflowY: 'auto',
              border: '1px solid #dee2e6',
              borderTop: 'none',
            }}>
              {isSearching ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                  검색 중...
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                  검색 결과가 없습니다
                </div>
              ) : (
                searchResults.map((item) => {
                  const alreadySelected = selectedStocks.some(s => s.code === item.code);
                  return (
                    <div
                      key={item.code}
                      onClick={() => addStock(item)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        color: alreadySelected ? '#adb5bd' : '#333',
                        borderBottom: '1px solid #f1f3f5',
                        cursor: alreadySelected ? 'default' : 'pointer',
                        transition: 'background-color 0.15s',
                        backgroundColor: alreadySelected ? '#f8f9fa' : '#fff',
                      }}
                      onMouseOver={(e) => { if (!alreadySelected) e.currentTarget.style.backgroundColor = '#e9ecef'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = alreadySelected ? '#f8f9fa' : '#fff'; }}
                    >
                      <div>
                        <span style={{ fontSize: '15px', fontWeight: 600 }}>{item.name}</span>
                        <span style={{
                          marginLeft: '10px',
                          fontSize: '13px',
                          color: '#868e96',
                          fontFamily: 'monospace',
                        }}>{item.code}</span>
                        {alreadySelected && (
                          <span style={{ marginLeft: '8px', fontSize: '12px', color: '#adb5bd' }}>추가됨</span>
                        )}
                      </div>
                      <span style={{
                        fontSize: '12px',
                        color: '#fff',
                        backgroundColor: item.market === 'KOSPI' ? '#4a90d9' : '#e67e22',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 500,
                      }}>{item.market}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* 선택된 종목 리스트 */}
        {selectedStocks.length > 0 && (
          <div style={{
            marginTop: '16px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              backgroundColor: '#1a2332',
              color: '#fff',
            }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>
                선택 종목 ({selectedStocks.length}개)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={openCodeEditor} style={{ ...btnBase, backgroundColor: '#495057', color: '#fff' }}>
                  코드 편집
                </button>
                <button onClick={copyCodeList} style={{ ...btnBase, backgroundColor: '#868e96', color: '#fff' }}>
                  {copied ? '복사됨!' : '코드 복사'}
                </button>
                <button onClick={viewQuotes} style={{ ...btnBase, backgroundColor: '#4a90d9', color: '#fff' }}>
                  시세 조회
                </button>
              </div>
            </div>
            <div>
              {selectedStocks.map((item, idx) => (
                <div
                  key={item.code}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 16px',
                    borderBottom: idx < selectedStocks.length - 1 ? '1px solid #f1f3f5' : 'none',
                    fontSize: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: '#adb5bd', fontSize: '12px', minWidth: '20px' }}>{idx + 1}</span>
                    <span style={{ fontWeight: 600 }}>{item.name || `종목 ${item.code}`}</span>
                    <span style={{ color: '#868e96', fontFamily: 'monospace', fontSize: '13px' }}>{item.code}</span>
                    {item.market && (
                      <span style={{
                        fontSize: '11px',
                        color: '#fff',
                        backgroundColor: item.market === 'KOSPI' ? '#4a90d9' : '#e67e22',
                        padding: '1px 6px',
                        borderRadius: '3px',
                      }}>{item.market}</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeStock(item.code)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dee2e6',
                      fontSize: '18px',
                      cursor: 'pointer',
                      padding: '0 4px',
                      lineHeight: 1,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = '#e03131')}
                    onMouseOut={(e) => (e.currentTarget.style.color = '#dee2e6')}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
            <div style={{
              padding: '10px 16px',
              backgroundColor: '#f8f9fa',
              fontSize: '12px',
              color: '#868e96',
              fontFamily: 'monospace',
              borderTop: '1px solid #f1f3f5',
            }}>
              URL: /h?codes={selectedStocks.map(s => s.code).join(',')}
            </div>
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

      {/* 코드 편집 모달 */}
      {showCodeEditor && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCodeEditor(false); }}
        >
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90vw',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #dee2e6',
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#1a2332' }}>코드 편집</h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#868e96' }}>
                한 줄에 하나씩 코드를 입력하세요 (예: 005930)
              </p>
            </div>
            <div style={{ padding: '16px 20px', flex: 1 }}>
              <textarea
                value={codeEditorText}
                onChange={(e) => setCodeEditorText(e.target.value)}
                style={{
                  width: '100%',
                  height: '280px',
                  padding: '12px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  lineHeight: '1.8',
                }}
                placeholder={'005930\n000660\n035720'}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#4a90d9')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#dee2e6')}
              />
            </div>
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
            }}>
              <button
                onClick={() => setShowCodeEditor(false)}
                style={{
                  ...btnBase,
                  backgroundColor: '#fff',
                  color: '#495057',
                  border: '1px solid #dee2e6',
                }}
              >
                취소
              </button>
              <button
                onClick={saveCodeEditor}
                style={{ ...btnBase, backgroundColor: '#4a90d9', color: '#fff' }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
