'use client';

import { useState } from 'react';
import { AlertTriangle, Check, X, MessageSquare } from 'lucide-react';

interface ResultItem {
  id: string;
  category: string;
  severity: string;
  message: string;
  filePath: string;
  lineNumber: number;
  reviewStatus: string;
  humanCorrection: string | null;
}

export default function ResultCard({ result }: { result: ResultItem }) {
  const [status, setStatus] = useState(result.reviewStatus);
  const [correction, setCorrection] = useState(result.humanCorrection || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analysis/result/${result.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewStatus: newStatus,
          humanCorrection: correction
        })
      });
      if (res.ok) {
        setStatus(newStatus);
        setIsEditing(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const severityColor = {
    CRITICAL: 'text-red-700 bg-red-50 border-red-200',
    HIGH: 'text-orange-700 bg-orange-50 border-orange-200',
    MEDIUM: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    LOW: 'text-blue-700 bg-blue-50 border-blue-200',
    INFO: 'text-gray-700 bg-gray-50 border-gray-200',
  }[result.severity] || 'text-gray-700 bg-gray-50';

  return (
    <div className={`p-4 rounded-lg border mb-4 bg-white dark:bg-gray-800 border-l-4 ${severityColor.replace('text-', 'border-l-')}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${severityColor}`}>
              {result.severity}
            </span>
            <span className="text-xs text-gray-400 font-mono">{result.category}</span>
          </div>
          <h4 className="text-gray-900 dark:text-white font-medium">{result.message}</h4>
          <div className="text-sm text-gray-500 font-mono mt-1">
            {result.filePath}:{result.lineNumber}
          </div>
          
          {result.humanCorrection && (
            <div className="mt-2 p-2 bg-blue-50 text-blue-800 text-sm rounded border border-blue-100">
              <strong>Correction:</strong> {result.humanCorrection}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 items-end">
          <div className="text-sm font-semibold text-gray-600">
            Status: <span className={status === 'FIXED' ? 'text-green-600' : status === 'FALSE_POSITIVE' ? 'text-gray-400' : 'text-blue-600'}>{status}</span>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => handleUpdate('FIXED')}
              disabled={loading}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Mark Fixed"
            >
              <Check className="w-5 h-5" />
            </button>
            <button 
              onClick={() => handleUpdate('FALSE_POSITIVE')} 
              disabled={loading}
              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded" title="False Positive"
            >
              <X className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Correct / Comment"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="mt-4 pt-4 border-t">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Expert Correction / Feedback
          </label>
          <textarea
            className="w-full p-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
            rows={3}
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder="Describe the correct behavior or fix..."
          />
          <div className="mt-2 flex justify-end gap-2">
             <button 
               onClick={() => setIsEditing(false)}
               className="px-3 py-1 text-sm text-gray-500"
             >
               Cancel
             </button>
             <button 
               onClick={() => handleUpdate('IN_PROGRESS')}
               className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
             >
               Save Feedback
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
