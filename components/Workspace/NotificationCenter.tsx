'use client';

import React, { useState } from 'react';
import { Bell, AlertTriangle, Shield, Layers, CheckCircle2, XCircle, Clock, Filter, Settings } from 'lucide-react';

interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  category: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

interface NotificationCenterProps {
  projectId?: string;
}

export default function NotificationCenter({ projectId }: NotificationCenterProps) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'critical',
      category: 'Security',
      title: '심각한 보안 취약점 발견',
      message: 'SQL Injection 취약점이 src/api/users.ts에서 발견되었습니다. 즉시 조치가 필요합니다.',
      timestamp: '5분 전',
      isRead: false,
    },
    {
      id: '2',
      type: 'warning',
      category: 'Architecture',
      title: '순환 의존성 감지',
      message: 'UserService와 OrderService 간 순환 의존성이 발생했습니다.',
      timestamp: '1시간 전',
      isRead: false,
    },
    {
      id: '3',
      type: 'info',
      category: 'Quality',
      title: '분석 완료',
      message: '프로젝트 분석이 완료되었습니다. 종합 점수: 82점',
      timestamp: '2시간 전',
      isRead: true,
    },
    {
      id: '4',
      type: 'success',
      category: 'Improvement',
      title: '이슈 해결됨',
      message: '5개의 코드 품질 이슈가 해결되었습니다.',
      timestamp: '3시간 전',
      isRead: true,
    },
    {
      id: '5',
      type: 'warning',
      category: 'Dependency',
      title: '취약한 패키지 발견',
      message: 'lodash@4.17.15에서 보안 취약점이 발견되었습니다. 업그레이드가 권장됩니다.',
      timestamp: '5시간 전',
      isRead: true,
    },
  ]);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'critical':
        return {
          bg: 'bg-red-500/10 dark:bg-red-900/20',
          border: 'border-red-500/20',
          icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
          badge: 'bg-red-500 text-white',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500/10 dark:bg-yellow-900/20',
          border: 'border-yellow-500/20',
          icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
          badge: 'bg-yellow-500 text-white',
        };
      case 'success':
        return {
          bg: 'bg-green-500/10 dark:bg-green-900/20',
          border: 'border-green-500/20',
          icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
          badge: 'bg-green-500 text-white',
        };
      default:
        return {
          bg: 'bg-blue-500/10 dark:bg-blue-900/20',
          border: 'border-blue-500/20',
          icon: <Bell className="w-5 h-5 text-blue-500" />,
          badge: 'bg-blue-500 text-white',
        };
    }
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">알림 센터</h2>
          {unreadCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={markAllAsRead}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            모두 읽음
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <Settings className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: '전체' },
          { id: 'critical', label: '심각' },
          { id: 'warning', label: '경고' },
          { id: 'info', label: '정보' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as typeof filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            해당 유형의 알림이 없습니다.
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const styles = getTypeStyles(notification.type);
            
            return (
              <div
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                className={`
                  p-4 rounded-xl border cursor-pointer transition-all
                  ${styles.bg} ${styles.border}
                  ${!notification.isRead ? 'ring-2 ring-offset-2 ring-blue-500/20' : ''}
                  hover:shadow-md
                `}
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-0.5">{styles.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles.badge}`}>
                        {notification.category}
                      </span>
                      {!notification.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                      {notification.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-500">
                      <Clock className="w-3 h-3" />
                      {notification.timestamp}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
