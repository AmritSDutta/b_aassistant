import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HumanizedMessage } from './HumanizedMessage';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: number;
  highlighted?: boolean;
}

interface ChatAreaProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onToggleHighlight?: (id: string) => void;
}

const FONT_STEPS = [15, 17, 19];
const FONT_KEY = 'b_font_size';

function readFontSize(): number {
  const raw = Number(localStorage.getItem(FONT_KEY));
  return FONT_STEPS.includes(raw) ? raw : 17;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ messages, onSendMessage, onToggleHighlight }) => {
  const [input, setInput] = useState('');
  const [fontSize, setFontSize] = useState<number>(readFontSize);
  const [maximized, setMaximized] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const endRefNormal = useRef<HTMLDivElement>(null);
  const endRefMax = useRef<HTMLDivElement>(null);

  const stepFontSize = (dir: -1 | 1) => {
    setFontSize((prev) => {
      const idx = FONT_STEPS.indexOf(prev);
      const next = FONT_STEPS[Math.min(FONT_STEPS.length - 1, Math.max(0, idx + dir))];
      localStorage.setItem(FONT_KEY, String(next));
      return next;
    });
  };

  // Escape closes the maximized reader
  useEffect(() => {
    if (!maximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMaximized(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [maximized]);

  // Auto-scroll the active stream to the most recent turn
  useEffect(() => {
    (maximized ? endRefMax.current : endRefNormal.current)?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, maximized]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    setProgress(max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 100);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const copyMessage = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch {
      // clipboard unavailable — ignore quietly
    }
  };

  const isThinking = messages.length > 0 && messages[messages.length - 1].sender === 'user';

  const renderMessage = (msg: ChatMessage) => (
    <div
      key={msg.id}
      id={`msg-${msg.id}`}
      className={`group relative p-4 rounded-lg shadow-sm msg-enter border-l-4 ${
        msg.sender === 'user'
          ? 'border-l-[var(--you)] bg-[var(--card)]'
          : 'border-l-[var(--accent)] bg-[var(--panel)]'
      }`}
      style={{ borderLeftColor: msg.highlighted ? 'var(--note)' : undefined }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="font-sans font-semibold text-[11px] tracking-wider uppercase px-1.5 py-0.5 rounded"
          style={{
            background: msg.sender === 'user' ? 'var(--you-soft)' : 'var(--accent-soft)',
            color: msg.sender === 'user' ? 'var(--you)' : 'var(--accent)',
          }}
        >
          {msg.sender === 'user' ? 'user:' : 'agent:'}
        </span>
        <span className="font-sans text-[10px]" style={{ color: 'var(--ink-soft)' }}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        {/* Hover actions: star + copy (quiet until hovered) */}
        <span className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onToggleHighlight && (
            <button
              type="button"
              aria-label={msg.highlighted ? 'Remove highlight' : 'Highlight this message'}
              onClick={() => onToggleHighlight(msg.id)}
              className="text-xs px-1 rounded"
              style={{ color: msg.highlighted ? 'var(--note)' : 'var(--ink-soft)' }}
            >
              {msg.highlighted ? '★' : '☆'}
            </button>
          )}
          <button
            type="button"
            aria-label="Copy message"
            onClick={() => copyMessage(msg)}
            className="text-[10px] font-mono px-1 rounded"
            style={{ color: copiedId === msg.id ? 'var(--you)' : 'var(--ink-soft)' }}
          >
            {copiedId === msg.id ? 'copied' : 'copy'}
          </button>
        </span>
      </div>
      {/* Lora Longform Reading Measure: 72ch, line-height 1.75, user-adjustable size */}
      <div
        className="font-serif leading-[1.75] tracking-[-0.003em] max-w-[72ch]"
        style={{ fontSize: `${fontSize}px`, color: 'var(--ink)' }}
      >
        <HumanizedMessage content={msg.text} />
      </div>
    </div>
  );

  const renderThinking = () => (
    <div className="p-3 rounded-lg bg-[var(--card)] border-l-4 border-l-[var(--accent)] flex items-center gap-2">
      <span className="font-sans text-[11px]" style={{ color: 'var(--ink-soft)' }}>
        agent is thinking
      </span>
      <span className="flex gap-1">
        <span className="thinking-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
        <span className="thinking-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
        <span className="thinking-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
      </span>
    </div>
  );

  const renderStream = (endRef: React.RefObject<HTMLDivElement>) => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 relative" onScroll={handleScroll}>
      {/* Reading progress: sense of investment while catching up */}
      <div
        className="sticky top-0 left-0 h-[2px] rounded-full transition-[width] duration-150"
        style={{ width: `${progress}%`, background: 'var(--note)' }}
      />
      {messages.map(renderMessage)}
      {isThinking && renderThinking()}
      <div ref={endRef} />
    </div>
  );

  const renderInput = () => (
    <div className="p-3 border-t" style={{ borderColor: 'var(--line)', background: 'var(--card)' }}>
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
          className="flex-1 px-3 py-2 font-serif text-[15px] leading-relaxed rounded-md border focus:outline-none focus:ring-1 resize-none"
          style={{
            borderColor: 'var(--line)',
            background: 'var(--panel)',
            color: 'var(--ink)',
          }}
        />
        <button
          type="submit"
          className="px-4 py-2.5 font-sans rounded-md text-sm font-medium transition-colors h-[42px]"
          style={{ background: 'var(--ink)', color: 'var(--paper)' }}
        >
          Send
        </button>
      </form>
    </div>
  );

  const renderControls = (onExpand?: () => void, onClose?: () => void) => (
    <div
      className="px-3 py-1.5 border-b flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.09em] font-bold"
      style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)', background: 'var(--card)' }}
    >
      <span>Dialogue</span>
      <span className="flex items-center gap-2">
        <button type="button" aria-label="Decrease font size" onClick={() => stepFontSize(-1)} className="px-1">
          A-
        </button>
        <button type="button" aria-label="Increase font size" onClick={() => stepFontSize(1)} className="px-1">
          A+
        </button>
        {onExpand && (
          <button type="button" aria-label="Maximize chat" onClick={onExpand} className="px-1">
            ⤢ expand
          </button>
        )}
        {onClose && (
          <button type="button" aria-label="Close reader" onClick={onClose} className="px-1">
            ✕ close
          </button>
        )}
      </span>
    </div>
  );

  return (
    <>
      {/* Normal docked chat (40%) */}
      <div className="h-[40%] flex flex-col" style={{ background: 'var(--paper)' }}>
        {renderControls(() => setMaximized(true))}
        {renderStream(endRefNormal)}
        {renderInput()}
      </div>

      {/* Maximized reader popup */}
      {maximized && (
        <div className="fixed inset-0 z-40 flex flex-col msg-enter" style={{ background: 'var(--paper)' }}>
          {renderControls(undefined, () => setMaximized(false))}
          {renderStream(endRefMax)}
          {renderInput()}
        </div>
      )}
    </>
  );
};
