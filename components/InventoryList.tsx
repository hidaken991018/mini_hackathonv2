'use client';

import { InventoryItemWithId } from '@/types';
import InventoryItem from './InventoryItem';

interface InventoryListProps {
  items: InventoryItemWithId[];
  onConsume: (id: string) => void;
  onItemClick: (item: InventoryItemWithId) => void;
  consumingId?: string;
}

export default function InventoryList({
  items,
  onConsume,
  onItemClick,
  consumingId,
}: InventoryListProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <p className="text-gray-500">在庫がありません</p>
          <p className="text-gray-400 text-sm mt-1">
            通知画面からレシートを読み取って
            <br />
            食材を登録してください
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {items.map((item) => (
        <InventoryItem
          key={item.id}
          item={item}
          onConsume={onConsume}
          onClick={onItemClick}
          isConsuming={consumingId === item.id}
        />
      ))}
    </div>
  );
}
