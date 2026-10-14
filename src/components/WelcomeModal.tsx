import React from 'react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS: Array<{ title: string; body: string }> = [
  {
    title: 'Upload a document',
    body: 'Drop a PDF or Word file (under 2MB) into the sidebar. It is parsed and indexed privately in your browser — nothing leaves your machine.',
  },
  {
    title: 'Connect your AI agent',
    body: 'bAssistant exposes 16 WebMCP tools. Any compatible AI extension or agent can connect, read the chat, search your document, and draw diagrams.',
  },
  {
    title: 'Ask questions',
    body: 'Type in the chat. Your agent answers in the stream (user: prefix) and maps systems live on the canvas above.',
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
