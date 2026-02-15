'use client';

import { InventoryItemWithId } from '@/types';
import InventoryItem from './InventoryItem';

interface InventoryListProps {
  items: InventoryItemWithId[];
  onConsume: (id: string) => void;
  onDelete: (id: string) => void;
  onItemClick: (item: InventoryItemWithId) => void;
  consumingId?: string;
}

export default function InventoryList({
  items,
  onConsume,
  onDelete,
  onItemClick,
  consumingId,
}: InventoryListProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-24 h-24 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
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
        <p className="text-gray-700 font-medium text-center">在庫がありません</p>
        <p className="text-gray-500 text-sm mt-2 text-center max-w-[240px]">
          右下の「＋」ボタンをタップして
          <br />
          食材を登録してください
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <InventoryItem
            key={item.id}
            item={item}
            onConsume={onConsume}
            onDelete={onDelete}
            onClick={onItemClick}
            isConsuming={consumingId === item.id}
          />
        ))}
      </div>
    </div>
  );

}
