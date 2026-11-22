import React from 'react';
import { Message } from '../types/index.js';
import { Bot, User } from 'lucide-react';

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';

  // Format markdown paragraphs, bold, lists, quotes, tables
  const formatContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = () => {
      if (tableRows.length > 0) {
        const headers = tableRows[0];
        const bodyRows = tableRows.slice(2); // Skip header and separator row
        elements.push(
          <div key={`table-${elements.length}`} className="my-3 overflow-x-auto rounded-lg border border-slate-700/80">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800 text-slate-300 font-semibold border-b border-slate-700">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="py-2 px-3">{h.trim()}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-800/30">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 text-slate-300">{cell.trim()}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Table line detection
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        inTable = true;
        const cols = line.split('|').slice(1, -1);
        tableRows.push(cols);
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="font-semibold text-emerald-400 text-sm mt-4 mb-2 tracking-wide">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="font-bold text-slate-100 text-base mt-4 mb-2">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('> ')) {
        // Blockquote
        elements.push(
          <blockquote key={i} className="border-l-2 border-emerald-500 pl-3 py-1 my-2 text-slate-400 italic text-xs bg-slate-850/40 rounded-r">
            {line.replace('> ', '')}
          </blockquote>
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        // Unordered list item
        const text = line.substring(2);
        elements.push(
          <li key={i} className="ml-4 list-disc text-slate-300 text-xs leading-relaxed my-1">
            {parseInlineMarkdown(text)}
          </li>
        );
      } else if (line.trim() === '') {
        elements.push(<div key={i} className="h-2" />);
      } else {
        // Paragraph
        elements.push(
          <p key={i} className="text-xs text-slate-200 leading-relaxed my-1">
            {parseInlineMarkdown(line)}
          </p>
        );
      }
    }

    if (inTable) {
      flushTable();
    }

    return elements;
  };

  const parseInlineMarkdown = (text: string): React.ReactNode => {
    // Replace **bold**
    const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\)|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono text-[11px]">{part.slice(1, -1)}</code>;
      }
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        return (
          <a
            key={idx}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 underline font-medium"
          >
            {linkMatch[1]}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className={`flex w-full space-x-3 py-4 px-6 ${isUser ? 'bg-slate-900/40' : 'bg-slate-950/70 border-y border-slate-900'}`}>
      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
        isUser ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-slate-950'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 font-bold" />}
      </div>

      <div className="flex-1 overflow-hidden space-y-1">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-xs text-slate-200">
            {isUser ? 'User' : 'Minimi Research Agent'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="text-slate-200 leading-relaxed text-xs">
          {formatContent(message.content)}
        </div>
      </div>
    </div>
  );
};
