import React from 'react';
import { Comparison } from '../types/index.js';
import { AlertCircle, CheckCircle2, TrendingUp, HelpCircle } from 'lucide-react';

interface ComparisonTableProps {
  comparisons: Comparison[];
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ comparisons }) => {
  if (comparisons.length === 0) return null;

  const getStatusBadge = (status: Comparison['classification']) => {
    switch (status) {
      case 'Changed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <TrendingUp className="w-3 h-3 mr-1" />
            Changed
          </span>
        );
      case 'Unchanged':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Unchanged
          </span>
        );
      case 'New information':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            New Feature
          </span>
        );
      case 'Not comparable':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">
            <HelpCircle className="w-3 h-3 mr-1" />
            Not Comparable
          </span>
        );
      case 'Unverified':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <HelpCircle className="w-3 h-3 mr-1" />
            Unverified
          </span>
        );
    }
  };

  return (
    <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 overflow-x-auto">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Historical vs. Current Fact Comparison
      </div>

      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-850/80 border-b border-slate-800 text-slate-400 font-medium">
              <th className="py-2.5 px-3">Entity</th>
              <th className="py-2.5 px-3">Aspect</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Historical Baseline</th>
              <th className="py-2.5 px-3">Current Verified</th>
              <th className="py-2.5 px-3">Evaluation Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {comparisons.map((c, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40 transition">
                <td className="py-2.5 px-3 font-semibold text-slate-200">{c.entity}</td>
                <td className="py-2.5 px-3 text-slate-400 capitalize">{c.aspect}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">{getStatusBadge(c.classification)}</td>
                <td className="py-2.5 px-3 text-slate-300 max-w-[160px] truncate" title={c.historicalClaim}>
                  {c.historicalClaim}
                </td>
                <td className="py-2.5 px-3 text-slate-300 max-w-[180px] truncate" title={c.currentClaim}>
                  {c.currentClaim}
                </td>
                <td className="py-2.5 px-3 text-slate-400 text-[11px] leading-relaxed max-w-[220px]">
                  {c.explanation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
