import React from 'react';
import { EvidenceItem } from '../types/index.js';
import { ExternalLink, CheckCircle } from 'lucide-react';

interface EvidenceCardProps {
  evidence: EvidenceItem[];
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence }) => {
  if (evidence.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
        <span>Verified Evidence Sources ({evidence.length})</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {evidence.map((item, index) => (
          <a
            key={index}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition"
          >
            <div className="flex items-center justify-between text-xs font-medium text-emerald-400 group-hover:text-emerald-300">
              <span className="truncate mr-2 font-semibold">{item.title}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
            </div>

            <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 font-normal leading-relaxed">
              {item.content}
            </p>

            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span className="truncate max-w-[180px]">{new URL(item.url).hostname}</span>
              {item.isOfficial && (
                <span className="flex items-center text-emerald-400 font-medium">
                  <CheckCircle className="w-3 h-3 mr-0.5" />
                  Official
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};
