import React, { useEffect, useRef } from 'react';
import { Message } from '../types/index.js';
import { MessageItem } from './MessageItem.js';
import { Sparkles, Calendar, Database, Search } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  onSelectPrompt: (prompt: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, onSelectPrompt }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const EXAMPLE_PROMPTS = [
    {
      title: 'Historical CRM Research',
      desc: 'Shortlisted 5 CRM tools for 20-person sales team on Monday',
      prompt: 'On Monday we shortlisted 5 CRM tools for a 20-person sales team. Has any of them changed pricing or shipped something big since?',
      icon: <Search className="w-4 h-4 text-emerald-400" />,
    },
    {
      title: 'Exact Historical Date Lookup',
      desc: 'Retrieves question and answer from 3 November with verification',
      prompt: 'What did I ask you on 3 November? Is your answer still correct today?',
      icon: <Calendar className="w-4 h-4 text-sky-400" />,
    },
    {
      title: 'PostgreSQL Hosting Pricing',
      desc: 'Resolves relative date (last Tuesday) & compares equivalent plans',
      prompt: 'Last Tuesday I asked you about Postgres hosting. Has any pricing changed since then?',
      icon: <Database className="w-4 h-4 text-purple-400" />,
    },
    {
      title: 'General Knowledge (No Web Search)',
      desc: 'Direct answer without unnecessary search calls',
      prompt: 'What is a database index?',
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
    },
  ];

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none overflow-y-auto">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400 shadow-lg shadow-emerald-500/10">
          <Sparkles className="w-7 h-7" />
        </div>

        <h2 className="text-lg font-semibold text-slate-100 mb-1">
          Autonomous Conversational Research Agent
        </h2>
        <p className="text-xs text-slate-400 max-w-md mb-8 leading-relaxed">
          Retrieves historical conversations across sessions, conducts verified web research via Tavily, compares facts across time with strict parity rules, and provides evidence-backed answers.
        </p>

        <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
          {EXAMPLE_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.prompt)}
              className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850/80 transition group text-left shadow-sm flex items-start space-x-3"
            >
              <div className="p-2 rounded-lg bg-slate-800 shrink-0 group-hover:scale-105 transition">
                {item.icon}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-xs text-slate-200 group-hover:text-emerald-400 transition truncate">
                  {item.title}
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                  {item.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60">
      {messages.map((m) => (
        <MessageItem key={m.id} message={m} />
      ))}
      <div ref={scrollRef} className="h-4" />
    </div>
  );
};
