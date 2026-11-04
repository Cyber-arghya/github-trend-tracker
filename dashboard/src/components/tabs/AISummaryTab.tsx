import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Calendar, ChevronRight } from 'lucide-react';
import type { AISummary } from '../../types';

interface AISummaryTabProps {
  summaries: AISummary[];
  selectedSummary: AISummary | null;
  onSelectSummary: (summary: AISummary) => void;
}

export const AISummaryTab: React.FC<AISummaryTabProps> = ({
  summaries,
  selectedSummary,
  onSelectSummary,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar with Summary Dates */}
      <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-3 h-[700px] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Analysis Reports ({summaries.length})
          </span>
          <Calendar className="h-4 w-4 text-slate-400" />
        </div>

        {summaries.map((sum) => {
          const isSelected = selectedSummary?.id === sum.id;
          return (
            <button
              key={sum.id}
              onClick={() => onSelectSummary(sum)}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border ${
                isSelected
                  ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500/40 shadow-sm'
                  : 'bg-slate-900/40 text-slate-400 border-slate-800/60 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <div>
                <div className="text-xs font-semibold">{sum.summary_date}</div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">{sum.model}</div>
              </div>
              <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-indigo-400' : 'text-slate-600'}`} />
            </button>
          );
        })}
      </div>

      {/* Summary Detail Viewer */}
      <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8 h-[700px] overflow-y-auto shadow-xl">
        {selectedSummary ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>DevOps & AI Architecture Report</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Report Date: <strong className="text-slate-200">{selectedSummary.summary_date}</strong> | Model:{' '}
                  <span className="font-mono text-indigo-400">{selectedSummary.model}</span>
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Production Verified
                </span>
              </div>
            </div>

            {/* Rendered Markdown Body */}
            <article className="prose prose-invert prose-slate max-w-none prose-headings:font-bold prose-headings:text-white prose-h2:text-lg prose-h3:text-base prose-p:text-slate-300 prose-p:leading-relaxed prose-a:text-indigo-400 prose-strong:text-white prose-ul:text-slate-300">
              <ReactMarkdown>{selectedSummary.content}</ReactMarkdown>
            </article>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Select an AI analysis report from the list to view architectural recommendations.
          </div>
        )}
      </div>
    </div>
  );
};
