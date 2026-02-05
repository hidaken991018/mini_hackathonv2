'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import BottomNav from '@/components/BottomNav';
import ScreenHeader from '@/components/ScreenHeader';
import InventoryList from '@/components/InventoryList';
import InventoryEditModal from '@/components/InventoryEditModal';
import { InventoryItemWithId } from '@/types';

const DEFAULT_USER_ID = 'mock-user-001';

export default function InventoryPage() {
  const [inventories, setInventories] = useState<InventoryItemWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItemWithId | null>(
    null
  );
  const [consumingId, setConsumingId] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  // 在庫一覧を取得
  useEffect(() => {
    const fetchInventories = async () => {
      try {
        const res = await axios.get(
          `/api/inventories?userId=${DEFAULT_USER_ID}`
        );
        if (res.data.success) {
          setInventories(res.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch inventories:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInventories();
  }, []);

  // 消費処理（楽観的更新）
  const handleConsume = async (id: string) => {
    setConsumingId(id);

    // 楽観的更新
    setInventories((prev) =>
      prev
        .map((inv) =>
          inv.id === id
            ? { ...inv, quantityValue: Math.max(0, (inv.quantityValue || 0) - 1) }
            : inv
        )
        .filter((inv) => (inv.quantityValue || 0) > 0)
    );

    try {
      await axios.patch(`/api/inventories/${id}/consume`);
    } catch (error) {
      console.error('Consume error:', error);
      // エラー時はリロード
      const res = await axios.get(`/api/inventories?userId=${DEFAULT_USER_ID}`);
      if (res.data.success) {
        setInventories(res.data.data);
      }
    } finally {
      setConsumingId(undefined);
    }
  };

  // 保存処理
  const handleSave = async (id: string, data: Partial<InventoryItemWithId>) => {
    setIsSaving(true);
    try {
      const res = await axios.put(`/api/inventories/${id}`, data);
      if (res.data.success) {
        setInventories((prev) =>
          prev.map((inv) => (inv.id === id ? { ...inv, ...data } : inv))
        );
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // 削除処理
  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/inventories/${id}`);
      setInventories((prev) => prev.filter((inv) => inv.id !== id));
      setSelectedItem(null);
    } catch (error) {
      console.error('Delete error:', error);
      alert('削除に失敗しました');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ScreenHeader
        title="在庫"
        rightAction={
          <span className="text-sm text-gray-500">{inventories.length}件</span>
        }
      />

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <svg
            className="w-8 h-8 animate-spin text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      ) : (
        <InventoryList
          items={inventories}
          onConsume={handleConsume}
          onItemClick={setSelectedItem}
          consumingId={consumingId}
        />
      )}

      <div className="pb-16" /> {/* BottomNav分のスペース */}
      <BottomNav />

      <InventoryEditModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onSave={handleSave}
        onDelete={handleDelete}
        isSaving={isSaving}
      />
    </div>
  );
}
