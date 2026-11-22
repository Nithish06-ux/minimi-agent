import React from 'react';
import { AgentStep } from '../types/index.js';
import { Search, Brain, GitCompare, FileText, CheckCircle2 } from 'lucide-react';

interface StatusIndicatorProps {
  steps: AgentStep[];
  isLoading: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ steps, isLoading }) => {
  if (!isLoading && steps.length === 0) return null;

  const getStepIcon = (type: AgentStep['type']) => {
    switch (type) {
      case 'intent_analysis':
        return <Brain className="w-3.5 h-3.5 text-blue-400 animate-pulse" />;
      case 'memory_retrieval':
        return <Brain className="w-3.5 h-3.5 text-purple-400" />;
      case 'web_search':
        return <Search className="w-3.5 h-3.5 text-amber-400 animate-spin" />;
      case 'evidence_analysis':
        return <FileText className="w-3.5 h-3.5 text-teal-400" />;
      case 'historical_comparison':
        return <GitCompare className="w-3.5 h-3.5 text-emerald-400" />;
      case 'response_generation':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="mx-6 mb-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg text-xs space-y-2 backdrop-blur">
      <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
        <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Autonomous Agent Execution Trace</span>
        </span>
        <span className="text-[11px] font-mono text-slate-500">
          {steps.length} {steps.length === 1 ? 'step' : 'steps'} executed
        </span>
      </div>

      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
        {steps.map((st, idx) => (
          <div key={idx} className="flex items-start space-x-2 text-slate-300">
            <span className="shrink-0 mt-0.5">{getStepIcon(st.type)}</span>
            <div className="flex-1">
              <span className="font-mono text-[11px] text-slate-400 mr-1.5 font-medium">
                [{st.type.replace('_', ' ').toUpperCase()}]
              </span>
              <span>{st.description}</span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center space-x-2 text-slate-400 animate-pulse italic pt-1">
            <Search className="w-3 h-3 text-emerald-400 animate-spin" />
            <span>Conducting cross-reference verification...</span>
          </div>
        )}
      </div>
    </div>
  );
};
