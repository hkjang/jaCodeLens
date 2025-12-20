'use client';

import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ApprovalItem {
  id: string;
  stepName: string;
  status: string;
  execute: {
    project: { name: string };
    inputHash: string;
    startedAt: string;
  };
}

export default function ApprovalList({ approvals }: { approvals: ApprovalItem[] }) {
  const [items, setItems] = useState(approvals);
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setLoading(id);
    try {
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: id,
          action,
          approverId: 'user-admin', // Mock user
          comment: `Manual ${action}`
        })
      });
      
      if (res.ok) {
        setItems(items.filter(i => i.id !== id));
      } else {
        alert('Action failed');
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    } finally {
      setLoading(null);
    }
  };

  if (items.length === 0) {
    return <div className="text-gray-500 text-center py-8">No pending approvals.</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">{item.stepName}</h4>
            <div className="text-sm text-gray-500">
              Project: <span className="font-medium">{item.execute.project.name}</span> | Started: {new Date(item.execute.startedAt).toLocaleDateString()}
            </div>
            <div className="text-xs text-gray-400 mt-1">Ref: {item.execute.inputHash || 'N/A'}</div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => handleAction(item.id, 'APPROVE')}
              disabled={loading === item.id}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" /> Approve
            </button>
            <button
              onClick={() => handleAction(item.id, 'REJECT')}
              disabled={loading === item.id}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" /> Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
