import React from 'react';
import { Message, AgentStep } from '../types/index.js';
import { MessageList } from './MessageList.js';
import { MessageInput } from './MessageInput.js';
import { StatusIndicator } from './StatusIndicator.js';
import { Clock, CheckCircle } from 'lucide-react';

interface ChatWindowProps {
  messages: Message[];
  steps: AgentStep[];
  isLoading: boolean;
  onSend: (message: string) => void;
  title?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  steps,
  isLoading,
  onSend,
  title,
}) => {
  return (
    <main className="flex-1 flex flex-col h-screen bg-slate-950 overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/50 backdrop-blur shrink-0">
        <div className="flex items-center space-x-3">
          <h2 className="font-medium text-xs text-slate-200 truncate max-w-md">
            {title || 'Active Research Workspace'}
          </h2>
          <span className="text-[11px] text-slate-500">•</span>
          <span className="flex items-center text-[11px] text-slate-400 font-mono">
            <Clock className="w-3 h-3 mr-1 text-slate-500" />
            Asia/Kolkata (IST)
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span>Hybrid Memory Engine</span>
          </div>
          <div className="hidden sm:flex items-center space-x-1.5 text-slate-500 text-[11px] font-mono">
            <span>Tavily + OpenAI</span>
          </div>
        </div>
      </header>

      {/* Main Messages View */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <MessageList messages={messages} onSelectPrompt={onSend} />
        <StatusIndicator steps={steps} isLoading={isLoading} />
      </div>

      {/* Input Field */}
      <MessageInput onSend={onSend} isLoading={isLoading} />
    </main>
  );
};
