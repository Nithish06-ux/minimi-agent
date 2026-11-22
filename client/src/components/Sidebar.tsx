import React from 'react';
import { Conversation } from '../types/index.js';
import { Plus, MessageSquare, Trash2, Cpu, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}) => {
  return (
    <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Cpu className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-100 text-sm tracking-wide">Minimi Agent</h1>
            <p className="text-xs text-emerald-400 font-medium">Research & Memory</p>
          </div>
        </div>
      </div>

      {/* New Conversation Button */}
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition shadow-sm hover:shadow active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>New Research Session</span>
        </button>
      </div>

      {/* Conversations History List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Recent Conversations
        </div>

        {conversations.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            No previous conversations recorded.
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeId;
            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`group flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition ${
                  isActive
                    ? 'bg-slate-800 text-slate-100 font-medium border border-slate-700/80 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="truncate">{conv.title || 'Untitled Session'}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this conversation history?')) {
                      onDelete(conv.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition ml-1 shrink-0"
                  title="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-[11px]">UTC / Asia:Kolkata</span>
        </div>
        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
          Ready
        </span>
      </div>
    </aside>
  );
};
