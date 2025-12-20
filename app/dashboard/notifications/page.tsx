'use client';

import { Bell, AlertTriangle, CheckCircle, Info, X, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

const initialNotifications = [
  { id: '1', type: 'critical', title: 'SQL Injection 취약점 발견', message: 'JacodeLens Core 프로젝트에서 심각한 보안 취약점이 발견되었습니다.', time: '5분 전', isRead: false },
  { id: '2', type: 'warning', title: '분석 완료', message: 'Payment Gateway 분석이 완료되었습니다. 점수: 65.2', time: '1시간 전', isRead: false },
  { id: '3', type: 'info', title: '새 버전 출시', message: 'JacodeLens v2.1.0이 출시되었습니다. 업데이트를 확인하세요.', time: '3시간 전', isRead: true },
  { id: '4', type: 'success', title: '이슈 해결됨', message: 'CryptoUtils.java의 MD5 취약점이 해결되었습니다.', time: '5시간 전', isRead: true },
  { id: '5', type: 'warning', title: '승인 대기', message: 'Security Review 승인이 필요합니다.', time: '1일 전', isRead: true },
];

const typeConfig = {
  critical: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">알림</h2>
          <p className="text-gray-500">시스템 알림과 이벤트를 확인합니다</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            모두 읽음 표시
          </button>
        )}
      </header>

      <div className="space-y-3">
        {notifications.map((notification, index) => {
          const config = typeConfig[notification.type as keyof typeof typeConfig];
          const Icon = config.icon;
          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 ${!notification.isRead ? 'ring-2 ring-blue-500/20' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{notification.title}</h3>
                      {!notification.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                    <span className="text-xs text-gray-400 mt-2 block">{notification.time}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!notification.isRead && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title="읽음 표시"
                    >
                      <Check className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
