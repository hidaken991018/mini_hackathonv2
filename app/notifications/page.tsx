'use client';

import axiosInstance from '@/lib/axios';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import ScreenHeader from '@/components/ScreenHeader';
import RecipeSlideModal from '@/components/RecipeSlideModal';
import NotificationCard from '@/components/NotificationCard';
import { Notification } from '@/types';

// 在庫アイテムの型（ローカル状態用）
type LocalInventory = {
  id: string;
  name: string;
  quantityValue?: number;
  quantityUnit?: string;
};

export default function NotificationsPage() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [hasLoadedNotifications, setHasLoadedNotifications] = useState(false);

  // Notifications画面の状態
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 在庫状態
  const [inventories, setInventories] = useState<LocalInventory[]>([]);

  // ログイン状態確認
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (hasLoadedNotifications || !user) return;

    const loadNotifications = async () => {
      try {
        const token = await getIdToken();
        const res = await fetch(`/api/notifications`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!res.ok) return;

        const payload = await res.json();
        if (!payload?.success || !Array.isArray(payload.data)) return;

        const mapped = payload.data.map((notif: any) => ({
          ...notif,
          createdAt: new Date(notif.createdAt),
          readAt: notif.readAt ? new Date(notif.readAt) : null,
        }));

        setNotifications(mapped);
        setHasLoadedNotifications(true);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    loadNotifications();
  }, [hasLoadedNotifications, user, getIdToken]);

  // 通知既読処理（楽観的更新 + API呼び出し）
  const handleMarkAsRead = async (id: string) => {
    // 楽観的更新：即座にUI反映
    setNotifications(
      notifications.map((notif) =>
        notif.id === id ? { ...notif, readAt: new Date() } : notif
      )
    );

    // バックグラウンドでAPI呼び出し
    try {
      await axiosInstance.patch(`/api/notifications/${id}/read`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // 全て既読処理（楽観的更新 + API呼び出し）
  const handleMarkAllAsRead = async () => {
    // 楽観的更新：即座にUI反映
    setNotifications(
      notifications.map((notif) =>
        notif.readAt === null ? { ...notif, readAt: new Date() } : notif
      )
    );

    // バックグラウンドでAPI呼び出し
    try {
      await axiosInstance.patch('/api/notifications/read-all', {});
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // レシピ調理完了処理（在庫削減後のローカル状態更新）
  const handleCookComplete = (deletedInventoryIds: string[]) => {
    setInventories((prev) =>
      prev.filter((inv) => !deletedInventoryIds.includes(inv.id))
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ScreenHeader
        title="Notifications"
        rightAction={
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            全て既読
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto pb-20 bg-gray-50">
        <div className="px-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkAsRead={() => handleMarkAsRead(notification.id)}
                onClick={() => setSelectedNotification(notification)}
              />
            ))}
          </div>
        </div>
      </div>

      <BottomNav />

      {/* レシピスライドモーダル */}
      <RecipeSlideModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onMarkAsRead={handleMarkAsRead}
        onCookComplete={handleCookComplete}
      />
    </div>
  );
}
