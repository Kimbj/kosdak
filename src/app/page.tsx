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
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // localStorage에서 선택 종목 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem('selectedStocks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedStocks(parsed);
        }
      }
    } catch {}
  }, []);

  // 선택 종목 변경 시 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem('selectedStocks', JSON.stringify(selectedStocks));
    } catch {}
  }, [selectedStocks]);

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

  // Naver 자동완성 API + 디바운스 (서버에서 5분 캐시)
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();

    if (!q) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.results || []);
          setHighlightIndex(-1);
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
    const text = selectedStocks.map(s => s.code).join('\n');
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
    padding: '9px 18px',
    fontSize: '13px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'transform 0.12s, box-shadow 0.12s',
    letterSpacing: '0.3px',
  };

  return (
    <div style={{
      margin: 0,
      padding: 0,
      backgroundColor: '#f8f9fa',
      color: '#333',
      minHeight: '100vh',
    }}>
      {/* 헤더 */}
      <div style={{ backgroundColor: '#1a2332' }}>
      <header style={{
        color: '#fff',
        padding: '30px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '800px',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}>
        <div>
          <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', fontWeight: 700 }}>
            히든 시세
          </h1>
          <p style={{ fontSize: '16px', margin: 0, color: '#adb5bd' }}>
            국내 상장사시세를 몰래 확인하세요
          </p>
        </div>
        <a
          href="/download/일일업무현황.zip"
          download
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '16px 28px',
            background: 'linear-gradient(135deg, #4a90d9, #357abd)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '10px',
            textDecoration: 'none',
            transition: 'transform 0.15s, box-shadow 0.15s',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(74,144,217,0.3)',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(74,144,217,0.4)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(74,144,217,0.3)'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          일일업무현황 다운로드
        </a>
      </header>
      </div>

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
            onKeyDown={(e) => {
              if (!showResults || searchResults.length === 0) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightIndex(prev => {
                  const next = prev < searchResults.length - 1 ? prev + 1 : 0;
                  // 스크롤 따라가기
                  const el = resultsRef.current?.children[next] as HTMLElement;
                  el?.scrollIntoView({ block: 'nearest' });
                  return next;
                });
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightIndex(prev => {
                  const next = prev > 0 ? prev - 1 : searchResults.length - 1;
                  const el = resultsRef.current?.children[next] as HTMLElement;
                  el?.scrollIntoView({ block: 'nearest' });
                  return next;
                });
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (highlightIndex >= 0 && highlightIndex < searchResults.length) {
                  addStock(searchResults[highlightIndex]);
                  setHighlightIndex(-1);
                }
              } else if (e.key === 'Escape') {
                setShowResults(false);
                setHighlightIndex(-1);
              }
            }}
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
                <div ref={resultsRef}>
                {searchResults.map((item, idx) => {
                  const alreadySelected = selectedStocks.some(s => s.code === item.code);
                  const isHighlighted = idx === highlightIndex;
                  return (
                    <div
                      key={item.code}
                      onClick={() => addStock(item)}
                      onMouseEnter={() => setHighlightIndex(idx)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        color: alreadySelected ? '#adb5bd' : '#333',
                        borderBottom: '1px solid #f1f3f5',
                        cursor: alreadySelected ? 'default' : 'pointer',
                        backgroundColor: isHighlighted ? '#e9ecef' : alreadySelected ? '#f8f9fa' : '#fff',
                      }}
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
                      {item.market && (
                        <span style={{
                          fontSize: '12px',
                          color: '#fff',
                          backgroundColor: item.market === 'KOSPI' ? '#4a90d9' : '#e67e22',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 500,
                        }}>{item.market}</span>
                      )}
                    </div>
                  );
                })}
                </div>
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
                <button
                  onClick={openCodeEditor}
                  style={{ ...btnBase, background: 'linear-gradient(135deg, #495057, #343a40)', color: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)'; }}
                >
                  코드 편집
                </button>
                <button
                  onClick={copyCodeList}
                  style={{ ...btnBase, background: 'linear-gradient(135deg, #868e96, #6c757d)', color: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.18)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.12)'; }}
                >
                  {copied ? '복사됨!' : '코드 복사'}
                </button>
                <button
                  onClick={viewQuotes}
                  style={{ ...btnBase, background: 'linear-gradient(135deg, #4a90d9, #357abd)', color: '#fff', boxShadow: '0 2px 8px rgba(74,144,217,0.3)' }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(74,144,217,0.4)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(74,144,217,0.3)'; }}
                >
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
            <div
              onClick={() => {
                const url = `https://kosdak.vercel.app/h?codes=${selectedStocks.map(s => s.code).join(',')}`;
                navigator.clipboard.writeText(url).catch(() => {});
              }}
              style={{
                padding: '10px 16px',
                backgroundColor: '#f8f9fa',
                fontSize: '12px',
                color: '#4a90d9',
                fontFamily: 'monospace',
                borderTop: '1px solid #f1f3f5',
                cursor: 'pointer',
                userSelect: 'all',
              }}
              title="클릭하면 URL이 복사됩니다"
            >
              kosdak.vercel.app/h?codes={selectedStocks.map(s => s.code).join(',')}
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* 웹 사용 */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            borderTop: '3px solid #4a90d9',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #4a90d9, #357abd)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1a2332' }}>웹 사용</h3>
            </div>
            <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.9' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <span style={{ color: '#4a90d9', fontWeight: 700, flexShrink: 0 }}>1.</span>
                <span>모니터링 하고 싶은 종목을 검색하여 선택합니다.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <span style={{ color: '#4a90d9', fontWeight: 700, flexShrink: 0 }}>2.</span>
                <span><strong style={{ color: '#1a2332' }}>시세 조회</strong> 버튼을 눌러 이동합니다.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#4a90d9', fontWeight: 700, flexShrink: 0 }}>3.</span>
                <span>빈 페이지로 보이지만 <kbd style={{ fontFamily: 'monospace', backgroundColor: '#e9ecef', padding: '2px 7px', borderRadius: '4px', border: '1px solid #dee2e6', fontSize: '12px', fontWeight: 600 }}>Ctrl + A</kbd>를 누르면 시세가 보입니다.</span>
              </div>
            </div>
          </div>

          {/* 프로그램 사용 */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            borderTop: '3px solid #1a2332',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #495057, #343a40)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1a2332' }}>프로그램 사용</h3>
            </div>
            <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.9' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <span style={{ color: '#495057', fontWeight: 700, flexShrink: 0 }}>1.</span>
                <span>웹에서 <strong style={{ color: '#1a2332' }}>코드 복사</strong>를 누릅니다.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <span style={{ color: '#495057', fontWeight: 700, flexShrink: 0 }}>2.</span>
                <span>프로그램에서 <kbd style={{ fontFamily: 'monospace', backgroundColor: '#e9ecef', padding: '2px 7px', borderRadius: '4px', border: '1px solid #dee2e6', fontSize: '12px', fontWeight: 600 }}>I</kbd> 키를 누른 후 <kbd style={{ fontFamily: 'monospace', backgroundColor: '#e9ecef', padding: '2px 7px', borderRadius: '4px', border: '1px solid #dee2e6', fontSize: '12px', fontWeight: 600 }}>Ctrl + V</kbd>로 붙여넣기 합니다.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <span style={{ color: '#495057', fontWeight: 700, flexShrink: 0 }}>3.</span>
                <span><kbd style={{ fontFamily: 'monospace', backgroundColor: '#e9ecef', padding: '2px 7px', borderRadius: '4px', border: '1px solid #dee2e6', fontSize: '12px', fontWeight: 600 }}>A</kbd> 키를 누르면 시세가 표시됩니다.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#495057', fontWeight: 700, flexShrink: 0 }}>4.</span>
                <span>노출된 시세는 5초 뒤 자동으로 사라집니다.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 광고 */}
      <section style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px' }}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
          data-ad-slot="XXXXXXXXXX"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: '(adsbygoogle = window.adsbygoogle || []).push({});',
          }}
        />
      </section>

      {/* 푸터 */}
      <footer style={{
        textAlign: 'center',
        padding: '30px 20px',
        color: '#999',
        fontSize: '12px',
        marginTop: '40px',
      }}>
        <p style={{ margin: 0 }}>투자에 대한 책임은 본인에게 있습니다.</p>
        <p style={{ margin: '5px 0 0 0' }}>데이터 출처: Daum Finance</p>
        <p style={{ margin: '12px 0 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
          </svg>
          <span>문의사항:</span>
          <a href="mailto:applecubic3@gmail.com" style={{ color: '#4a90d9', textDecoration: 'none' }}>applecubic3@gmail.com</a>
        </p>
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
          onMouseDown={(e) => { if (e.target === e.currentTarget) (e.currentTarget as HTMLDivElement).dataset.bg = '1'; }}
          onMouseUp={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            if (e.target === e.currentTarget && el.dataset.bg === '1') setShowCodeEditor(false);
            delete el.dataset.bg;
          }}
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
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
              >
                취소
              </button>
              <button
                onClick={saveCodeEditor}
                style={{ ...btnBase, background: 'linear-gradient(135deg, #4a90d9, #357abd)', color: '#fff', boxShadow: '0 2px 8px rgba(74,144,217,0.3)' }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(74,144,217,0.4)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(74,144,217,0.3)'; }}
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
