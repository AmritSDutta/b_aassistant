import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Branding } from './components/Branding';
import { FileUpload } from './components/FileUpload';
import { BlankSlot } from './components/BlankSlot';
import { CanvasArea } from './components/CanvasArea';
import { ChatArea, ChatMessage } from './components/ChatArea';
import { WebMCPProvider } from './webmcp/provider';
import { ToolContext } from './webmcp/tools';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('b_theme') as 'light' | 'dark') || 'dark';
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

  const webmcpRef = useRef<WebMCPProvider | null>(null);

  const handlePostAgentMessage = useCallback((text: string) => {
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      sender: 'agent',
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
  }, []);

  // Initialize WebMCP Provider
  useEffect(() => {
    const context: ToolContext = {
      getMessages: () => messagesRef.current,
      postMessage: (text: string) => handlePostAgentMessage(text),
    };

    const provider = new WebMCPProvider(context);
    provider.register();
    webmcpRef.current = provider;

    return () => {
      provider.unregister();
    };
  }, [handlePostAgentMessage]);

  // Keep tool context updated when messages change
  useEffect(() => {
    if (webmcpRef.current) {
      webmcpRef.current.updateContext({
        getMessages: () => messagesRef.current,
        postMessage: (text: string) => handlePostAgentMessage(text),
      });
    }
  }, [messages, handlePostAgentMessage]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('b_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleSendMessage = (text: string) => {
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Left Sidebar (20% width) */}
      <aside className="w-[20%] min-w-[220px] max-w-[360px] h-full flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
        <Branding theme={theme} onToggleTheme={toggleTheme} />
        <FileUpload />
        <BlankSlot />
      </aside>

      {/* Main Area (80% width) */}
      <main className="flex-1 h-full flex flex-col overflow-hidden">
        <CanvasArea />
        <ChatArea messages={messages} onSendMessage={handleSendMessage} />
      </main>
    </div>
  );
};

export default App;
