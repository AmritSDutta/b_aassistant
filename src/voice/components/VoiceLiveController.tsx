import React, { useEffect, useState } from 'react';
import { VoiceStatus } from '../types/audio';
import { globalTaskManager, BackgroundTaskRecord } from '../tasks/taskManager';

interface VoiceLiveControllerProps {
  status: VoiceStatus;
  statusText: string;
  captionPreview: string;
  isListening: boolean;
  onToggleListening: () => void;
  onOpenSettings: () => void;
}

export const VoiceLiveController: React.FC<VoiceLiveControllerProps> = ({
  status,
  statusText,
  captionPreview,
  isListening,
  onToggleListening,
  onOpenSettings,
}) => {
  const [activeTask, setActiveTask] = useState<BackgroundTaskRecord | null>(null);

  useEffect(() => {
    const updateActive = (): void => {
      const active = globalTaskManager.getActiveTasks();
      setActiveTask(active.length > 0 ? active[0] : null);
    };

    updateActive();
    return globalTaskManager.subscribe(() => {
      updateActive();
    });
  }, []);
  const getStatusBadge = () => {
    switch (status) {
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Connecting
          </span>
        );
      case 'listening':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Listening
          </span>
        );
      case 'speaking':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
            Live Speaking
          </span>
        );
      case 'executing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-spin" />
            Executing Tool
          </span>
        );
      case 'interrupted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Interrupted
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Voice Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            Voice Standby
          </span>
        );
    }
  };

  return (
    <div
      data-testid="voice-live-controller"
      title={statusText}
      className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800/80 rounded-lg px-2.5 py-1 backdrop-blur-sm"
    >
      <button
        type="button"
        data-testid="voice-toggle-btn"
        onClick={onToggleListening}
        title={isListening ? 'Stop live voice' : 'Start live voice'}
        className={`relative flex items-center justify-center w-7 h-7 rounded-md transition-all ${
          isListening
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
            : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white'
        }`}
      >
        {isListening ? (
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>

      {getStatusBadge()}

      {activeTask && (
        <span
          data-testid="voice-bg-task-badge"
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse"
          title={`Background Subagent: ${activeTask.prompt}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          ⚡ Drawing Architecture...
        </span>
      )}

      {captionPreview && (
        <div
          data-testid="voice-caption-preview"
          className="max-w-[220px] sm:max-w-[320px] truncate text-[11px] text-zinc-300 font-sans italic bg-zinc-950/60 border border-zinc-800/60 px-2 py-0.5 rounded"
          title={captionPreview}
        >
          {captionPreview}
        </div>
      )}

      <button
        type="button"
        data-testid="voice-settings-btn"
        onClick={onOpenSettings}
        title="Voice & Subagent Settings"
        className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 transition-colors"
      >
        <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>
  );
};
