'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import { getConsumeInfo } from '@/lib/units';
import ScreenHeader from '@/components/ScreenHeader';
import InventoryList from '@/components/InventoryList';
import InventoryEditModal from '@/components/InventoryEditModal';
import ReceiptUploadPanel from '@/components/ReceiptUploadPanel';
import MainLayout from '@/components/MainLayout';
import { InventoryItemWithId } from '@/types';
import { getFoodCategoryName, FOOD_CATEGORY_NAMES } from '@/lib/expiry-defaults';

// --- フィルタ定義 ---
type ExpiryFilter = 'all' | 'expired' | 'soon' | 'none';
type StorageFilter = 'all' | 'staple' | 'consumable';

const EXPIRY_FILTER_OPTIONS: { value: ExpiryFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'expired', label: '期限切れ' },
  { value: 'soon', label: '3日以内' },
  { value: 'none', label: '期限なし' },
];

const STORAGE_FILTER_OPTIONS: { value: StorageFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'staple', label: '常備品' },
  { value: 'consumable', label: '使い切り' },
];

// 期限判定ヘルパー
function getExpiryStatus(item: InventoryItemWithId): 'expired' | 'soon' | 'ok' | 'none' {
  const dateStr = item.expireDate || item.consumeBy;
  if (!dateStr) return 'none';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return 'expired';
  if (days <= 3) return 'soon';
  return 'ok';
}

export default function InventoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [inventories, setInventories] = useState<InventoryItemWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItemWithId | null>(
    null
  );
  const [consumingId, setConsumingId] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  // --- フィルタ状態 ---
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [storageFilter, setStorageFilter] = useState<StorageFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const fetchInventories = useCallback(async () => {
    if (!user) return;

    try {
      const res = await axiosInstance.get('/api/inventories');
      if (res.data.success) {
        setInventories(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch inventories:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 未認証時はサインインページへリダイレクト
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
    }
  }, [authLoading, user, router]);

  // 在庫一覧を取得
  useEffect(() => {
    fetchInventories();
  }, [fetchInventories]);

  // --- フィルタリングロジック ---
  const filteredInventories = useMemo(() => {
    return inventories.filter((item) => {
      // 期限フィルタ
      if (expiryFilter !== 'all') {
        const status = getExpiryStatus(item);
        if (expiryFilter === 'expired' && status !== 'expired') return false;
        if (expiryFilter === 'soon' && status !== 'soon') return false;
        if (expiryFilter === 'none' && status !== 'none') return false;
      }

      // カテゴリフィルタ
      if (categoryFilter !== 'all') {
        const cat = item.category || getFoodCategoryName(item.name);
        if (cat !== categoryFilter) return false;
      }

      // 保管状態フィルタ
      if (storageFilter !== 'all') {
        if (storageFilter === 'staple' && !item.isStaple) return false;
        if (storageFilter === 'consumable' && item.isStaple) return false;
      }

      return true;
    });
  }, [inventories, expiryFilter, categoryFilter, storageFilter]);

  // アクティブなフィルタの数
  const activeFilterCount = [
    expiryFilter !== 'all',
    categoryFilter !== 'all',
    storageFilter !== 'all',
  ].filter(Boolean).length;

  // フィルタリセット
  const resetFilters = () => {
    setExpiryFilter('all');
    setCategoryFilter('all');
    setStorageFilter('all');
  };

  // 消費処理（楽観的更新）
  const handleConsume = async (id: string) => {
    setConsumingId(id);

    // 対象アイテムを取得して消費情報を算出
    const targetItem = inventories.find((inv) => inv.id === id);
    if (!targetItem) {
      setConsumingId(undefined);
      return;
    }

    const { consumeAmount, willDelete } = getConsumeInfo(
      targetItem.quantityValue,
      targetItem.quantityUnit
    );

    // 楽観的更新（IDで特定し、他のアイテムには触らない）
    setInventories((prev) => {
      if (willDelete) {
        return prev.filter((inv) => inv.id !== id);
      }
      return prev.map((inv) => {
        if (inv.id !== id) return inv;
        const currentValue = inv.quantityValue ?? 1;
        const newValue = Math.round(Math.max(0, currentValue - consumeAmount) * 100) / 100;
        return { ...inv, quantityValue: newValue };
      });
    });

    try {
      await axiosInstance.patch(`/api/inventories/${id}/consume`);
    } catch (error) {
      console.error('Consume error:', error);
      // エラー時はリロード
      const res = await axiosInstance.get('/api/inventories');
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
      const res = await axiosInstance.put(`/api/inventories/${id}`, data);
      if (res.data.success && res.data.data) {
        // APIレスポンスで状態を更新（購入日などサーバー側の値を確実に反映）
        const updated = res.data.data;
        setInventories((prev) =>
          prev.map((inv) => (inv.id === id ? { ...inv, ...updated } : inv))
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
      await axiosInstance.delete(`/api/inventories/${id}`);
      setInventories((prev) => prev.filter((inv) => inv.id !== id));
      setSelectedItem(null);
    } catch (error) {
      console.error('Delete error:', error);
      alert('削除に失敗しました');
    }
  };

  return (
    <MainLayout>
      <ScreenHeader
        title="在庫"
        rightAction={
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {filteredInventories.length !== inventories.length
                ? `${filteredInventories.length}/${inventories.length}件`
                : `${inventories.length}件`}
            </span>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              aria-label="フィルター"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        }
      />

      {/* フィルターパネル */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm space-y-3 flex-shrink-0">
          {/* 期限フィルタ */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1.5">期限</div>
            <div className="flex gap-1.5 flex-wrap">
              {EXPIRY_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setExpiryFilter(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    expiryFilter === opt.value
                      ? opt.value === 'expired'
                        ? 'bg-red-500 text-white border-red-500'
                        : opt.value === 'soon'
                          ? 'bg-yellow-500 text-white border-yellow-500'
                          : 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* カテゴリフィルタ */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1.5">カテゴリ</div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all whitespace-nowrap flex-shrink-0 ${
                  categoryFilter === 'all'
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                すべて
              </button>
              {FOOD_CATEGORY_NAMES.map((name) => (
                <button
                  key={name}
                  onClick={() => setCategoryFilter(name)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all whitespace-nowrap flex-shrink-0 ${
                    categoryFilter === name
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* 保管状態フィルタ */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1.5">保管状態</div>
            <div className="flex gap-1.5 flex-wrap">
              {STORAGE_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStorageFilter(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    storageFilter === opt.value
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* リセットボタン */}
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
            >
              フィルターをリセット
            </button>
          )}
        </div>
      )}

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
          items={filteredInventories}
          onConsume={handleConsume}
          onDelete={handleDelete}
          onItemClick={setSelectedItem}
          consumingId={consumingId}
        />
      )}

      <InventoryEditModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onSave={handleSave}
        onDelete={handleDelete}
        isSaving={isSaving}
      />

      <ReceiptUploadPanel
        onInventoryRegistered={fetchInventories}
        launcherPositionClassName="bottom-32 right-4"
      />
    </MainLayout>
  );
}
