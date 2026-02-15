'use client';

import axiosInstance from '@/lib/axios';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import ReceiptUploadPanel from '@/components/ReceiptUploadPanel';
import ScreenHeader from '@/components/ScreenHeader';
import RecipeSlideModal from '@/components/RecipeSlideModal';
import RecipeCreateModal from '@/components/RecipeCreateModal';
import NotificationCard from '@/components/NotificationCard';
import MainLayout from '@/components/MainLayout';
import { Notification, Recipe } from '@/types';

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
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [hasLoadedNotifications, setHasLoadedNotifications] = useState(false);
  const [recipeForEdit, setRecipeForEdit] = useState<Recipe | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Notifications画面の状態
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 在庫状態
  const [inventories, setInventories] = useState<LocalInventory[]>([]);

  // 選択された通知（最新の状態を反映するためにIDから検索）
  const selectedNotification =
    notifications.find((n) => n.id === selectedNotificationId) || null;

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

  // 通知のレシピ編集開始（recipeIdからレシピを取得してモーダル表示）
  const handleEditByRecipeId = async (recipeId: string) => {
    if (!user) return;
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/recipes/${recipeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (payload?.success && payload?.data) {
        setRecipeForEdit(payload.data);
        setIsEditModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch recipe for edit:', err);
    }
  };

  // 通知を削除（レシピは残る）
  const handleDeleteNotification = async (notificationId: string) => {
    if (!user || !confirm('この通知を一覧から削除しますか？レシピは残ります。')) return;
    try {
      await axiosInstance.delete(`/api/notifications/${notificationId}`);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setSelectedNotificationId(null);
      setIsEditModalOpen(false);
      setRecipeForEdit(null);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // レシピを削除（レシピ画面からも消える）
  const handleDeleteRecipe = async (recipeId: string) => {
    if (!user) return;
    try {
      await axiosInstance.delete(`/api/recipes/${recipeId}`);
      setNotifications((prev) => prev.filter((n) => n.recipeId !== recipeId));
      setSelectedNotificationId(null);
      setIsEditModalOpen(false);
      setRecipeForEdit(null);
    } catch (err) {
      console.error('Failed to delete recipe:', err);
    }
  };

  // 通知のレシピ更新完了（title/body/recipeをすべて更新）
  const handleRecipeUpdated = (recipe: Recipe) => {
    const recipeForNotification = {
      ingredients: recipe.ingredients.map((ing) => {
        const q = [ing.quantityValue, ing.quantityUnit].filter(Boolean).join('');
        return q ? `${ing.name} ${q}`.trim() : ing.name;
      }),
      steps: recipe.steps,
      cookingTime: recipe.cookingTime,
      servings: recipe.servings,
      imageUrl: recipe.imageUrl,
    };
    setNotifications((prev) =>
      prev.map((n) =>
        n.recipeId === recipe.id
          ? {
              ...n,
              title: recipe.title,
              body: recipe.description ?? n.body,
              recipe: recipeForNotification,
            }
          : n
      )
    );
    setRecipeForEdit(null);
    setIsEditModalOpen(false);
    setSelectedNotificationId(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
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
      <div className="bg-gray-50/10">
        <div className="px-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkAsRead={() => handleMarkAsRead(notification.id)}
                onClick={() => setSelectedNotificationId(notification.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <ReceiptUploadPanel />

      {/* レシピスライドモーダル */}
      <RecipeSlideModal
        notification={selectedNotification}
        onClose={() => setSelectedNotificationId(null)}
        onMarkAsRead={handleMarkAsRead}
        onCookComplete={handleCookComplete}
        onEditByRecipeId={handleEditByRecipeId}
        onDelete={handleDeleteRecipe}
        onDeleteNotification={handleDeleteNotification}
      />

      {/* レシピ編集モーダル（通知経由） */}
      {recipeForEdit && (
        <RecipeCreateModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setRecipeForEdit(null);
          }}
          onSave={handleRecipeUpdated}
          initialData={recipeForEdit}
          mode="edit"
        />
      )}
    </MainLayout>
  );
}
