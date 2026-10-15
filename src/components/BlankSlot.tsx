import React from 'react';
import { ChatMessage } from './ChatArea';
import { humanizeSymbols } from '../lib/symbolHumanizer';

interface BlankSlotProps {
  highlights: ChatMessage[];
  onJumpTo?: (id: string) => void;
}

export const BlankSlot: React.FC<BlankSlotProps> = ({ highlights, onJumpTo }) => {
  return (
    <div className="flex-1 p-4 flex flex-col min-h-0" style={{ borderTop: '1px solid var(--line)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.09em]" style={{ color: 'var(--note)' }}>
          Session Highlights
        </span>
        <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--ink)' }}>
          {highlights.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {highlights.length === 0 && (
          <p className="text-[11px] leading-relaxed mt-2" style={{ color: 'var(--ink-soft)' }}>
            Hover a message in the dialogue and click ☆ to keep its key takeaways here for the rest of your session.
          </p>
        )}
        {highlights.map((msg) => {
          const humanized = humanizeSymbols(msg.text);
          return (
            <button
              key={msg.id}
              type="button"
              onClick={() => onJumpTo?.(msg.id)}
              className="w-full text-left p-2 rounded-md border transition-colors hover:border-[var(--note)]"
              style={{ borderColor: 'var(--line)', background: 'var(--card)' }}
            >
              <span
                className="font-sans font-semibold text-[10px] tracking-wider uppercase"
                style={{ color: msg.sender === 'user' ? 'var(--you)' : 'var(--accent)' }}
              >
                {msg.sender === 'user' ? 'user:' : 'agent:'}
              </span>
              <span
                className="block text-[12px] leading-snug mt-0.5 line-clamp-2"
                style={{ color: 'var(--ink)' }}
              >
                {humanized.slice(0, 90)}
                {humanized.length > 90 ? '…' : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
