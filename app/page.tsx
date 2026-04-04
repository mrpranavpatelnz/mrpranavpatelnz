'use client';

import { useState, useRef, useCallback } from 'react';

const DOMAINS = [
  { value: 'any', label: 'Any Challenge', icon: '◈' },
  { value: 'Finance & Wealth', label: 'Finance & Wealth', icon: '◆' },
  { value: 'Health & Longevity', label: 'Health & Longevity', icon: '◇' },
  { value: 'Career & Business', label: 'Career & Business', icon: '▲' },
  { value: 'Brisbane / Local', label: 'Brisbane / Local', icon: '◉' },
  { value: 'Relationships', label: 'Relationships', icon: '○' },
  { value: 'Mental Performance', label: 'Mental Performance', icon: '△' },
  { value: 'Technology & Startups', label: 'Technology & Startups', icon: '⬡' },
];

const EXAMPLES = [
  "I'm earning $120k but can't seem to build any real wealth — I save but it never compounds",
  "I've tried every diet but my energy crashes every afternoon and I can't focus",
  "I'm stuck in a mid-level manager role and can't figure out how to break through",
  "I want to buy an investment property in Brisbane but everyone says the market is too hot",
  "My business has plateaued at $50k/month for the past 8 months and I don't know why",
  "I keep starting side projects but never finish them — lack of follow-through is killing me",
];

// Simple markdown renderer — converts markdown to HTML-like JSX structure
function parseMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let listBuffer: string[] = [];
  let listType: 'ol' | 'ul' | null = null;

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    if (listType === 'ol') {
      nodes.push(
        <ol key={key} className="list-decimal pl-6 mb-3 space-y-1">
          {listBuffer.map((item, idx) => (
            <li key={idx} className="text-zinc-300 text-[0.95rem] leading-[1.75]" dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />
          ))}
        </ol>
      );
    } else {
      nodes.push(
        <ul key={key} className="list-disc pl-6 mb-3 space-y-1">
          {listBuffer.map((item, idx) => (
            <li key={idx} className="text-zinc-300 text-[0.95rem] leading-[1.75]" dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />
          ))}
        </ul>
      );
    }
    listBuffer = [];
    listType = null;
  };

  while (i < lines.length) {
    const line = lines[i];

    // H2
    if (line.startsWith('## ')) {
      flushList(`list-${i}`);
      const content = line.slice(3);
      nodes.push(
        <h2 key={i} className="text-[1.05rem] font-bold text-amber-400 mt-8 mb-3 pb-2 border-b border-amber-400/15 tracking-tight first:mt-0">
          {content}
        </h2>
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      flushList(`list-${i}`);
      const content = line.slice(4);
      nodes.push(
        <h3 key={i} className="text-[0.95rem] font-semibold text-zinc-200 mt-4 mb-2">
          {content}
        </h3>
      );
      i++;
      continue;
    }

    // HR
    if (line.startsWith('---')) {
      flushList(`list-${i}`);
      nodes.push(<hr key={i} className="border-zinc-800 my-5" />);
      i++;
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) {
      if (listType !== 'ol') {
        flushList(`list-${i}-prev`);
        listType = 'ol';
      }
      listBuffer.push(olMatch[2]);
      i++;
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*]\s+(.*)/);
    if (ulMatch) {
      if (listType !== 'ul') {
        flushList(`list-${i}-prev`);
        listType = 'ul';
      }
      listBuffer.push(ulMatch[1]);
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushList(`list-${i}`);
      i++;
      continue;
    }

    // Paragraph
    flushList(`list-${i}`);
    nodes.push(
      <p key={i} className="text-zinc-300 text-[0.95rem] leading-[1.75] mb-3" dangerouslySetInnerHTML={{ __html: inlineMarkdown(line) }} />
    );
    i++;
  }

  flushList('list-final');
  return nodes;
}

function inlineMarkdown(text: string): string {
  return text
    // Bold+italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="text-zinc-100 font-semibold"><em>$1</em></strong>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-100 font-semibold">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em class="text-zinc-400 italic">$1</em>')
    // Inline code
    .replace(/`(.*?)`/g, '<code class="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-[0.82rem] text-amber-400 font-mono">$1</code>');
}

export default function Home() {
  const [challenge, setChallenge] = useState('');
  const [domain, setDomain] = useState('any');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasResult, setHasResult] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = challenge.trim();
    if (!trimmed || isLoading) return;

    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setIsLoading(true);
    setError('');
    setResponse('');
    setHasResult(false);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge: trimmed, domain }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `Error ${res.status}`);
      }

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      setHasResult(true);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setResponse(accumulated);
        // Smooth scroll to response
        if (responseRef.current) {
          responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setHasResult(false);
    } finally {
      setIsLoading(false);
    }
  }, [challenge, domain, isLoading]);

  const handleExample = (example: string) => {
    setChallenge(example);
    setResponse('');
    setHasResult(false);
    setError('');
  };

  const handleReset = () => {
    if (abortRef.current) abortRef.current.abort();
    setChallenge('');
    setResponse('');
    setHasResult(false);
    setError('');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* Background texture */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(245,200,66,0.04) 0%, transparent 100%)',
      }} />

      <div className="relative max-w-3xl mx-auto px-4 py-12 md:py-20">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-amber-400/8 border border-amber-400/20 rounded-full px-4 py-1.5 text-amber-400 text-xs font-medium tracking-wider uppercase mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Top 0.1% Frameworks
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-50 mb-4">
            The 0.1% Advisor
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed">
            Describe any challenge. Get the rare, high-leverage framework that the top 0.1% use — built from first principles, not generic advice.
          </p>
        </div>

        {/* Main form */}
        {!hasResult && (
          <div className="fade-in">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Domain selector */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Domain (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {DOMAINS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDomain(d.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 border ${
                        domain === d.value
                          ? 'bg-amber-400/12 border-amber-400/40 text-amber-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                      }`}
                    >
                      <span className="text-[10px]">{d.icon}</span>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Challenge input */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Your Challenge
                </label>
                <textarea
                  value={challenge}
                  onChange={(e) => setChallenge(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmit();
                    }
                  }}
                  placeholder="Describe your challenge in as much detail as you want. The more specific, the better the framework..."
                  rows={5}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 resize-none text-[0.95rem] leading-relaxed transition-all"
                />
                <p className="text-zinc-600 text-xs mt-1.5">⌘↵ to submit</p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!challenge.trim() || isLoading}
                className="w-full py-3.5 px-6 bg-amber-400 hover:bg-amber-300 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-semibold rounded-xl transition-all duration-150 text-[0.95rem] tracking-tight disabled:cursor-not-allowed"
              >
                {isLoading ? 'Thinking...' : 'Get the 0.1% Framework →'}
              </button>
            </form>

            {/* Examples */}
            <div className="mt-10">
              <p className="text-xs font-medium text-zinc-600 uppercase tracking-wider mb-3">Examples</p>
              <div className="space-y-2">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => handleExample(ex)}
                    className="block w-full text-left px-4 py-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/60 hover:border-zinc-700 rounded-lg text-zinc-500 hover:text-zinc-300 text-sm transition-all duration-150 leading-relaxed"
                  >
                    &ldquo;{ex}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-800/40 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Response */}
        {hasResult && (
          <div ref={responseRef} className="fade-in">
            {/* Challenge recap */}
            <div className="mb-6 p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl">
              <p className="text-xs text-zinc-600 uppercase tracking-wider font-medium mb-1.5">Your Challenge</p>
              <p className="text-zinc-300 text-sm leading-relaxed">{challenge}</p>
              {domain !== 'any' && (
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-amber-400/8 border border-amber-400/20 rounded text-amber-400/80 text-xs">
                  {DOMAINS.find(d => d.value === domain)?.icon} {domain}
                </span>
              )}
            </div>

            {/* Response content */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 md:p-8">
              <div className={`response-body ${isLoading ? 'cursor-blink' : ''}`}>
                {response ? parseMarkdown(response) : (
                  <div className="flex items-center gap-3 text-zinc-500 py-4">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-amber-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm">Applying 0.1% frameworks...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions (shown after streaming completes) */}
            {!isLoading && response && (
              <div className="mt-6 flex flex-wrap gap-3 fade-in">
                <button
                  onClick={handleReset}
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg text-zinc-300 text-sm font-medium transition-all"
                >
                  ← New Challenge
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(response);
                  }}
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg text-zinc-300 text-sm font-medium transition-all"
                >
                  Copy Response
                </button>
                <button
                  onClick={() => {
                    setHasResult(false);
                    setResponse('');
                    setError('');
                  }}
                  className="px-5 py-2.5 bg-amber-400/10 hover:bg-amber-400/15 border border-amber-400/25 rounded-lg text-amber-400 text-sm font-medium transition-all"
                >
                  Ask a Follow-up
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-zinc-700 text-xs">
            Powered by DeepSeek R1 on Groq · Built for Pranav
          </p>
        </div>

      </div>
    </div>
  );
}
