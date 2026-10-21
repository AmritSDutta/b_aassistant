import React from 'react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS: Array<{ title: string; body: string }> = [
  {
    title: 'Connect via WebMCP Inspector or direct tool calls',
    body: 'Install the Chrome WebMCP Inspector plugin and attach your API key, or trigger direct WebMCP tool calls in DevTools. bAssistant exposes 17 pre-configured tools for your AI agent to chat, search documents, and render live canvas diagrams.',
  },
  {
    title: 'Ask questions & visualize',
    body: 'Type in the chat. Your agent answers in the stream (user: prefix) and maps systems live on the canvas above.',
  },
  {
    title: 'Talk to it live (voice mode)',
    body: 'Tap [ 🎙️ voice ] in the header to save a Gemini API key, then hit the mic in the chat toolbar for a hands-free, full-duplex live session. Ask out loud and bAssistant keeps drawing on the canvas while it talks.',
  },
  {
    title: 'Add context (Optional)',
    body: 'Optionally drop a PDF/Word file (under 2MB) or add reference URLs in the sidebar to provide custom project context. Documents are parsed and indexed privately in your browser — nothing leaves your machine.',
  },
  {
    title: 'Star key answers',
    body: 'Hover any message and click the star. Starred answers collect under Session Highlights in the sidebar.',
  },
  {
    title: 'Read comfortably',
    body: 'Use A- / A+ to resize text and the expand button to open the chat as a full-screen reader for long sessions.',
  },
  {
    title: 'Export your session',
    body: 'One click produces an executive PDF: canvas diagram on top, readable transcript beneath — Bengali and Hindi included.',
  },
];

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(20, 33, 61, 0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border shadow-2xl msg-enter"
        style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.09em]" style={{ color: 'var(--accent)' }}>
            How to use bAssistant
          </p>
          <h2 className="mt-1 text-xl font-bold" style={{ fontFamily: "'Lora', Georgia, serif" }}>
            Welcome to your analyst cockpit
          </h2>
        </div>

        <ol className="px-6 pb-2 space-y-3 max-h-[55vh] overflow-y-auto">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mx-6 my-2 p-2.5 rounded-lg border text-xs flex items-start gap-2" style={{ borderColor: 'var(--line)', background: 'var(--card)' }}>
          <span className="font-bold text-[10px] uppercase tracking-wider shrink-0 mt-0.5" style={{ color: 'var(--accent)' }}>Inspector Tip</span>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
            Tested with Google Chrome Labs' <strong>WebMCP Inspector</strong> plugin. Open Chrome DevTools &gt; WebMCP tab to inspect and invoke registered tools.
          </p>
        </div>

        <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: 'var(--line)' }}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-semibold transition-colors"
            style={{ background: 'var(--ink)', color: 'var(--paper)' }}
          >
            Get started
          </button>
        </div>
      </div>
    </div>
  );
};
