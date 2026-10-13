import React, { useState } from 'react';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInput('');
  };

  return (
    <div className="h-[60%] flex flex-col bg-white dark:bg-slate-950">
      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2.5 rounded-md leading-relaxed ${
              msg.sender === 'user'
                ? 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-l-2 border-sky-500'
                : 'bg-sky-50/50 dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 border-l-2 border-emerald-500'
            }`}
          >
            <span className="font-bold text-xs uppercase mr-2 text-sky-600 dark:text-sky-400">
              {msg.sender === 'user' ? 'user:' : 'agent:'}
            </span>
            <span className="whitespace-pre-wrap">{msg.text}</span>
          </div>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-md text-sm font-medium transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
