import React, { useState, useEffect, useRef } from 'react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: number;
}

interface ChatAreaProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ messages, onSendMessage }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the most recent chat turn
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  return (
    <div className="h-[40%] flex flex-col bg-white dark:bg-slate-950 font-serif">
      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-4 rounded-lg shadow-sm ${
              msg.sender === 'user'
                ? 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-l-4 border-sky-500'
                : 'bg-sky-50/40 dark:bg-slate-900/40 text-[#2b2b2b] dark:text-slate-100 border-l-4 border-emerald-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-sans font-semibold text-[11px] tracking-wider uppercase px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {msg.sender === 'user' ? 'user:' : 'agent:'}
              </span>
              <span className="font-sans text-[10px] text-slate-400">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {/* Lora Longform Reading Measure: 17px, line-height 1.75, subtle tracking, 72ch measure */}
            <div className="font-serif text-[17px] leading-[1.75] tracking-[-0.003em] max-w-[72ch] whitespace-pre-wrap selection:bg-sky-200 dark:selection:bg-sky-900">
              {msg.text}
            </div>
          </div>
        ))}
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Type your message... (Enter to send, Shift+Enter for newline)"
            className="flex-1 px-3 py-2 font-serif text-[15px] leading-relaxed rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
          />
          <button
            type="submit"
            className="px-4 py-2.5 font-sans bg-sky-500 hover:bg-sky-600 text-white rounded-md text-sm font-medium transition-colors h-[42px]"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
