import React from 'react';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            JacodeLens
          </h1>
          <p className="text-xs text-gray-500 mt-1">Enterprise AI Ops</p>
        </div>
        <nav className="mt-4 px-4 space-y-2">
          <NavLink href="/dashboard">Overview</NavLink>
          <NavLink href="/dashboard/approvals">Approvals</NavLink>
          <NavLink href="/dashboard/reports">Reports</NavLink>
          <NavLink href="/dashboard/audit">Audit Logs</NavLink>
          <NavLink href="/dashboard/settings">Settings</NavLink>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-700 transition-colors"
    >
      {children}
    </Link>
  );
}
