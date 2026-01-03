'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Plus, PlayCircle, Settings, ChevronUp 
} from 'lucide-react';

export default function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { 
      icon: <Plus className="w-5 h-5" />, 
      label: '새 프로젝트', 
      href: '/dashboard/projects/new',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    { 
      icon: <PlayCircle className="w-5 h-5" />, 
      label: '분석 시작', 
      href: '/dashboard/execution',
      color: 'bg-green-500 hover:bg-green-600'
    },
    { 
      icon: <Settings className="w-5 h-5" />, 
      label: '설정', 
      href: '/dashboard/settings',
      color: 'bg-gray-500 hover:bg-gray-600'
    }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action Buttons */}
      <div className={`flex flex-col-reverse gap-3 mb-3 transition-all duration-200 ${
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        {actions.map((action, index) => (
          <Link
            key={action.href}
            href={action.href}
            className={`flex items-center gap-3 px-4 py-2.5 ${action.color} text-white rounded-full shadow-lg transition-all hover:scale-105`}
            style={{ transitionDelay: `${index * 50}ms` }}
          >
            {action.icon}
            <span className="font-medium whitespace-nowrap">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-xl hover:shadow-2xl flex items-center justify-center transition-all hover:scale-105 ${
          isOpen ? 'rotate-180' : ''
        }`}
      >
        <ChevronUp className="w-6 h-6" />
      </button>
    </div>
  );
}
