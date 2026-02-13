'use client';

import { Notification } from '@/types';
import Image from 'next/image';

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: () => void;
  onClick: () => void;
}

export default function NotificationCard({
  notification,
  onMarkAsRead,
  onClick,
}: NotificationCardProps) {
  const isUnread = notification.readAt === null;

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      onClick={() => {
        onClick();
        onMarkAsRead();
      }}
      className="bg-white/80 backdrop-blur-sm rounded-[2rem] overflow-hidden pop-shadow border border-white group transition-all duration-300 hover:translate-y-[-2px] hover:shadow-xl active:scale-[0.98]"
    >
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {notification.image ? (
          <Image
            src={notification.image}
            alt={notification.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
            unoptimized
          />
        ) : notification.type === 'expiry' || notification.type === 'warning' ? (
           <div className="w-full h-full flex items-center justify-center bg-red-50">
            <Image 
              src="/images/notifications/expiry.png" 
              alt="Warning"
              width={64}
              height={64}
              className="object-contain group-hover:scale-110 transition-transform duration-200"
            />
           </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <svg
              className="w-12 h-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
        )}
        {isUnread && (
          <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
          {notification.title}
        </h3>
        <p className="text-xs text-gray-600 mb-2 line-clamp-2 leading-relaxed">
          {notification.body}
        </p>
        <div className="text-xs text-gray-400">
          {formatDate(notification.createdAt)}
        </div>
      </div>
    </div>
  );
}
