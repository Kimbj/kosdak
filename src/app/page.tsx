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

  useEffect(() => {
    try {
      const saved = localStorage.getItem('selectedStocks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedStocks(parsed);
          return;
        }
      }
    } catch {}
    setSelectedStocks([
      { name: '삼성전자', code: '005930', market: 'KOSPI' },
      { name: '카카오', code: '035720', market: 'KOSPI' },
      { name: 'NAVER', code: '035420', market: 'KOSPI' },
    ]);
  }, []);

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

  return (
    <div className="min-h-screen selection:bg-blue-100">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl shadow-[0_8px_24px_rgba(23,28,31,0.04)]">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 h-16">
          <a className="text-xl font-bold tracking-tighter text-primary-container" href="#">
            Hidden Price
          </a>
          <a
            href="/download/일일업무현황.zip"
            download
            className="flex items-center gap-2 bg-primary-container text-on-primary px-5 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-base">download</span>
            일일업무현황 다운로드
          </a>
        </div>
      </nav>

      <main className="pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-24 hero-pattern">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/40 to-surface" />
          <div className="relative max-w-7xl mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-on-surface mb-4 leading-[1.05]">
              히든 시세
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-container to-on-primary-container ml-3">
                Hidden Price
              </span>
            </h1>
            <p className="text-sm md:text-base text-on-surface-variant/80 max-w-2xl mx-auto mb-8 leading-relaxed font-medium tracking-tight">
              현명한 투자자의 선택, 실시간 시세를 몰래 확인하세요.
              업무 중에도 안전하고 조용하게 데이터를 관리하는 금융 센티넬.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/download/일일업무현황.zip"
                download
                className="flex items-center justify-center gap-2 bg-primary-container text-on-primary px-8 py-3.5 rounded-xl font-bold text-sm hover:shadow-2xl hover:shadow-primary-container/20 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                일일업무현황 다운로드
              </a>
              <a
                href="#features"
                className="flex items-center justify-center gap-2 border border-outline-variant bg-white/50 backdrop-blur-sm text-on-surface px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-surface-container-low transition-all active:scale-95"
              >
                Learn More
              </a>
            </div>
          </div>
        </section>

        {/* Search & Selection Bento */}
        <section id="search" className="max-w-7xl mx-auto px-6 -mt-8 relative z-10 mb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Search */}
            <div className="md:col-span-1 bg-surface-container-lowest p-8 rounded-xl shadow-[0_8px_32px_rgba(23,28,31,0.06)] border border-outline-variant/10 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold mb-4">Stock Search</h3>
                <div ref={searchRef} className="relative">
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
                    placeholder="종목명 또는 코드 입력"
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg py-3 px-4 pl-12 focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all text-sm"
                  />
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                    search
                  </span>

                  {showResults && (
                    <div className="absolute top-full left-0 right-0 bg-white rounded-b-lg shadow-lg z-50 max-h-80 overflow-y-auto border border-outline-variant/20 border-t-0">
                      {isSearching ? (
                        <div className="p-4 text-center text-on-surface-variant text-sm">검색 중...</div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-4 text-center text-on-surface-variant text-sm">검색 결과가 없습니다</div>
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
                                className={`flex justify-between items-center px-4 py-3 cursor-pointer border-b border-surface-container-high/50 last:border-b-0 transition-colors ${
                                  isHighlighted ? 'bg-surface-container-high' : alreadySelected ? 'bg-surface-container-low opacity-50' : 'hover:bg-surface-container-low'
                                }`}
                              >
                                <div>
                                  <span className="font-semibold text-sm">{item.name}</span>
                                  <span className="ml-2 text-xs font-mono text-on-surface-variant">{item.code}</span>
                                  {alreadySelected && <span className="ml-2 text-xs text-on-surface-variant">추가됨</span>}
                                </div>
                                {item.market && (
                                  <span className={`text-[10px] text-white px-2 py-0.5 rounded font-medium ${
                                    item.market === 'KOSPI' ? 'bg-primary-container' : 'bg-orange-500'
                                  }`}>
                                    {item.market}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8">
                <p className="text-sm text-on-surface-variant mb-4 font-medium">Trending Now</p>
                <div className="flex flex-wrap gap-2">
                  {['삼성전자', 'NAVER'].map(name => (
                    <span key={name} className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-medium cursor-default">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Items */}
            <div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-[0_8px_32px_rgba(23,28,31,0.06)] border border-outline-variant/10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Selected Items</h3>
                <div className="flex gap-2">
                  <button
                    onClick={openCodeEditor}
                    className="p-2 hover:bg-surface-container-highest rounded transition-colors text-on-surface-variant"
                    title="코드 편집"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button
                    onClick={copyCodeList}
                    className="p-2 hover:bg-surface-container-highest rounded transition-colors text-on-surface-variant"
                    title="코드 복사"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {copied ? 'check' : 'content_copy'}
                    </span>
                  </button>
                  <button
                    onClick={viewQuotes}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    View
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {selectedStocks.map((item) => (
                  <div
                    key={item.code}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-surface-container-low rounded-lg group transition-all hover:shadow-sm"
                  >
                    <div className="flex items-center gap-4 mb-2 md:mb-0">
                      <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-on-primary text-lg">monitoring</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-on-surface text-sm">{item.name || `종목 ${item.code}`}</h4>
                        <p className="text-xs font-mono text-on-surface-variant tracking-widest">{item.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.market && (
                        <span className={`text-[10px] text-white px-2 py-0.5 rounded font-medium ${
                          item.market === 'KOSPI' ? 'bg-primary-container' : 'bg-orange-500'
                        }`}>
                          {item.market}
                        </span>
                      )}
                      <button
                        onClick={() => removeStock(item.code)}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors text-on-surface-variant hover:text-red-500"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </div>
                  </div>
                ))}
                {selectedStocks.length === 0 && (
                  <div className="flex items-center justify-center p-8 border-2 border-dashed border-outline-variant/20 rounded-lg">
                    <p className="text-sm text-on-surface-variant italic">Add stocks to monitor hidden feeds</p>
                  </div>
                )}
              </div>

              {selectedStocks.length > 0 && (
                <div
                  onClick={() => {
                    const url = `https://www.applecubic.life/h?codes=${selectedStocks.map(s => s.code).join(',')}`;
                    navigator.clipboard.writeText(url).catch(() => {});
                  }}
                  className="mt-4 px-4 py-2 bg-surface-container-low rounded-lg text-xs text-on-tertiary-fixed-variant font-mono cursor-text select-all hover:bg-surface-container-high transition-colors truncate"
                  title="클릭하면 URL이 복사됩니다"
                >
                  www.applecubic.life/h?codes={selectedStocks.map(s => s.code).join(',')}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Core Advantage */}
        <section className="bg-surface-container-low py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold tracking-tight mb-4">Core Advantage</h2>
              <p className="text-on-surface-variant max-w-xl mx-auto">
                더욱 강력해진 보안과 정확도, 히든 시세만의 독자적인 기술력입니다.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Real-time */}
              <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 shadow-[0_8px_24px_rgba(23,28,31,0.02)] hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 bg-on-tertiary-fixed-variant/10 rounded-lg flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-on-tertiary-fixed-variant" style={{ fontVariationSettings: "'FILL' 1" }}>update</span>
                </div>
                <h4 className="text-xl font-bold mb-3">Real-time Quotes</h4>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  60초 간격의 정교한 데이터 동기화를 통해 가장 신선한 시장 정보를 제공합니다. 사내 방화벽에 막혀도 정상 조회됩니다.
                </p>
              </div>
              {/* Discreet - highlighted */}
              <div className="bg-primary-container p-8 rounded-xl shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>enhanced_encryption</span>
                </div>
                <h4 className="text-xl font-bold mb-3 text-white">Discreet Check</h4>
                <p className="text-on-primary-container text-sm leading-relaxed brightness-150">
                  업계 유일의 &apos;Ctrl+A&apos; 히든 텍스트 기술을 적용했습니다. 전체 선택 시에만 드러나는 실시간 데이터 보안을 경험하세요.
                </p>
              </div>
              {/* Free */}
              <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 shadow-[0_8px_24px_rgba(23,28,31,0.02)] hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 bg-on-tertiary-fixed-variant/10 rounded-lg flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-on-tertiary-fixed-variant" style={{ fontVariationSettings: "'FILL' 1" }}>free_cancellation</span>
                </div>
                <h4 className="text-xl font-bold mb-3">Free Service</h4>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  복잡한 회원가입이나 개인정보 요구 없이 누구나 즉시 사용할 수 있는 공익적 금융 도구를 지향합니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How to Utilize */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-extrabold tracking-tight mb-12">How to Utilize</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Web */}
            <div className="p-8 bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm">
              <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <span className="text-primary-container font-black">01</span> Web Interface
              </h3>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-surface-container-highest text-[10px] flex items-center justify-center font-bold">1</span>
                  <p className="text-sm text-on-surface">종목 검색창에서 관심 있는 주식명을 입력하여 선택합니다.</p>
                </li>
                <li className="flex gap-4">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-surface-container-highest text-[10px] flex items-center justify-center font-bold">2</span>
                  <p className="text-sm text-on-surface">생성된 시세 카드에서 &apos;View&apos; 버튼을 눌러 시세 창을 엽니다.</p>
                </li>
                <li className="flex gap-4">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-surface-container-highest text-[10px] flex items-center justify-center font-bold">3</span>
                  <p className="text-sm text-on-surface">
                    숨겨진 시세를 확인하려면 페이지에서 <kbd className="px-2 py-1 bg-surface-container-highest rounded font-mono text-[10px]">Ctrl+A</kbd>를 누르세요.
                  </p>
                </li>
              </ul>
            </div>
            {/* Program */}
            <div className="p-8 bg-tertiary-container rounded-xl shadow-lg text-white">
              <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <span className="text-on-tertiary-container font-black">02</span> Enterprise Sync
              </h3>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-white/10 text-[10px] flex items-center justify-center font-bold">1</span>
                  <p className="text-sm text-on-primary-container brightness-150">웹에서 코드 복사 버튼을 눌러 종목 코드를 복사합니다.</p>
                </li>
                <li className="flex gap-4">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-white/10 text-[10px] flex items-center justify-center font-bold">2</span>
                  <p className="text-sm text-on-primary-container brightness-150">
                    프로그램에서 <kbd className="px-2 py-0.5 bg-white/10 rounded font-mono text-[10px]">I</kbd> 키를 누른 후 <kbd className="px-2 py-0.5 bg-white/10 rounded font-mono text-[10px]">Ctrl+V</kbd>로 붙여넣기 합니다.
                  </p>
                </li>
                <li className="flex gap-4">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-white/10 text-[10px] flex items-center justify-center font-bold">3</span>
                  <p className="text-sm text-on-primary-container brightness-150">
                    <kbd className="px-2 py-0.5 bg-white/10 rounded font-mono text-[10px]">A</kbd> 키를 누르면 시세가 표시되고, 5초 뒤 자동으로 사라집니다.
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* 광고 */}
      <section className="max-w-7xl mx-auto px-6 mb-12">
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-5533017880847916"
          data-ad-slot="1744419630"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: '(adsbygoogle = window.adsbygoogle || []).push({});',
          }}
        />
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-surface-container-highest/15 bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="max-w-xs">
            <span className="text-lg font-bold text-primary-container mb-4 block">Hidden Price</span>
            <p className="text-xs md:text-sm leading-relaxed text-on-surface-variant opacity-80">
              &copy; 2024 Hidden Price (히든 시세). All rights reserved. Data provided by Daum Finance.<br />
              투자에 대한 책임은 본인에게 있습니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-12">        
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold text-primary-container uppercase tracking-wider">Contact</p>
              <a className="text-xs md:text-sm text-on-surface-variant opacity-80 hover:opacity-100 hover:text-primary-container transition-opacity" href="mailto:applecubic3@gmail.com">
                applecubic3@gmail.com
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* 코드 편집 모달 */}
      {showCodeEditor && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) (e.currentTarget as HTMLDivElement).dataset.bg = '1'; }}
          onMouseUp={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            if (e.target === e.currentTarget && el.dataset.bg === '1') setShowCodeEditor(false);
            delete el.dataset.bg;
          }}
        >
          <div className="bg-white rounded-xl w-[400px] max-w-[90vw] max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-surface-container-highest">
              <h3 className="text-lg font-bold text-on-surface">코드 편집</h3>
              <p className="mt-1 text-sm text-on-surface-variant">한 줄에 하나씩 코드를 입력하세요 (예: 005930)</p>
            </div>
            <div className="p-5 flex-1">
              <textarea
                value={codeEditorText}
                onChange={(e) => setCodeEditorText(e.target.value)}
                className="w-full h-70 p-3 text-sm font-mono border border-outline-variant/30 rounded-lg outline-none resize-y leading-7 focus:ring-2 focus:ring-primary-container/20"
                placeholder={'005930\n000660\n035720'}
              />
            </div>
            <div className="p-4 border-t border-surface-container-highest flex justify-end gap-3">
              <button
                onClick={() => setShowCodeEditor(false)}
                className="px-5 py-2.5 text-sm font-semibold text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors"
              >
                취소
              </button>
              <button
                onClick={saveCodeEditor}
                className="px-5 py-2.5 text-sm font-bold text-on-primary bg-primary-container rounded-lg hover:opacity-90 active:scale-95 transition-all"
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
