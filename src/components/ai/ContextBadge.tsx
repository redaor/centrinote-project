import React from 'react';
import { FileText, Brain } from 'lucide-react';

interface ContextBadgeProps {
  fileCount: number;
  totalSize?: number;
  className?: string;
}

export function ContextBadge({ fileCount, totalSize, className = '' }: ContextBadgeProps) {
  if (fileCount === 0) return null;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full shadow-lg ${className}`}>
      <div className="flex items-center gap-1.5">
        <FileText className="w-4 h-4" />
        <span className="text-sm font-semibold">{fileCount}</span>
        <span className="text-xs opacity-90">document{fileCount > 1 ? 's' : ''}</span>
      </div>
      {totalSize && (
        <>
          <div className="w-px h-4 bg-white/30"></div>
          <span className="text-xs opacity-90">{(totalSize / 1024).toFixed(1)} Ko</span>
        </>
      )}
      <Brain className="w-4 h-4 animate-pulse" />
    </div>
  );
}
