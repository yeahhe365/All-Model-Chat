import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LogEntry } from '../../services/logService';
import { LOG_LEVEL_COLORS, CATEGORY_COLORS } from './constants';

export const LogRow: React.FC<{ log: LogEntry }> = React.memo(({ log }) => {
  const [isDataExpanded, setIsDataExpanded] = useState(false);
  const hasData = log.data !== undefined;

  const timeString = log.timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const ms = log.timestamp.getMilliseconds().toString().padStart(3, '0');

  return (
    <div className="border-b border-[var(--theme-border-secondary)] hover:bg-[var(--theme-bg-tertiary)] text-xs group transition-colors">
      <div 
        className={`flex items-start p-2 gap-3 ${hasData ? 'cursor-pointer' : ''}`}
        onClick={hasData ? () => setIsDataExpanded(!isDataExpanded) : undefined}
      >
        <span className="w-20 text-[var(--theme-text-tertiary)] flex-shrink-0 font-mono opacity-70 pt-0.5">
          {timeString}.{ms}
        </span>
        
        <span className={`w-12 font-bold flex-shrink-0 pt-0.5 ${LOG_LEVEL_COLORS[log.level]}`}>
          {log.level}
        </span>

        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 self-start uppercase tracking-wider ${CATEGORY_COLORS[log.category] || 'bg-gray-700'}`}>
            {log.category}
        </span>

        <span className="flex-grow break-words whitespace-pre-wrap text-[var(--theme-text-primary)] font-mono leading-relaxed">
          {log.message}
        </span>
        
        {hasData && (
            <div className="text-[var(--theme-text-tertiary)] opacity-50 group-hover:opacity-100 flex-shrink-0">
                <ChevronDown size={14} className={`transition-transform duration-200 ${isDataExpanded ? 'rotate-180' : ''}`} />
            </div>
        )}
      </div>
      
      {hasData && isDataExpanded && (
        <div className="bg-[var(--theme-bg-code-block)] border-t border-[var(--theme-border-secondary)] p-3 overflow-x-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
          <pre className="text-[11px] text-[var(--theme-text-secondary)] font-mono">
            {JSON.stringify(log.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
});
