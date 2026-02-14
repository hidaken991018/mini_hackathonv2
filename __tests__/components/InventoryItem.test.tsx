/**
 * InventoryItem コンポーネント テスト
 *
 * 在庫アイテムの表示と消費ボタンの動作を検証します。
 */

import { render, screen, fireEvent } from '@testing-library/react';
import InventoryItem from '@/components/InventoryItem';
import { InventoryItemWithId } from '@/types';

describe('InventoryItem', () => {
  const mockItem: InventoryItemWithId = {
    id: 'inv-1',
    name: '卵',
    quantityValue: 6,
    quantityUnit: '個',
    expireDate: '2025-02-10',
    consumeBy: undefined,
    note: undefined,
    imageUrl: undefined,
    createdAt: '2025-01-30T00:00:00.000Z',
    updatedAt: '2025-01-30T00:00:00.000Z',
  };

  const mockOnConsume = jest.fn();
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('在庫アイテムの情報が正しく表示される', () => {
    render(
      <InventoryItem
        item={mockItem}
        onConsume={mockOnConsume}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText('卵')).toBeInTheDocument();
    expect(screen.getByText('6個')).toBeInTheDocument();
    expect(screen.getByText('賞味: 2025-02-10')).toBeInTheDocument();
  });

  it('消費ボタンをクリックするとonConsumeが呼ばれる', () => {
    render(
      <InventoryItem
        item={mockItem}
        onConsume={mockOnConsume}
        onClick={mockOnClick}
      />
    );

    const consumeButton = screen.getByRole('button', { name: '-1消費' });
    fireEvent.click(consumeButton);

    expect(mockOnConsume).toHaveBeenCalledWith('inv-1');
    expect(mockOnConsume).toHaveBeenCalledTimes(1);
  });

  it('アイテムをクリックするとonClickが呼ばれる', () => {
    render(
      <InventoryItem
        item={mockItem}
        onConsume={mockOnConsume}
        onClick={mockOnClick}
      />
    );

    const itemElement = screen.getByText('卵').closest('div');
    if (itemElement) {
      fireEvent.click(itemElement);
    }

    expect(mockOnClick).toHaveBeenCalledWith(mockItem);
  });

  it('消費ボタンクリック時はonClickが呼ばれない', () => {
    render(
      <InventoryItem
        item={mockItem}
        onConsume={mockOnConsume}
        onClick={mockOnClick}
      />
    );

    const consumeButton = screen.getByRole('button', { name: '-1消費' });
    fireEvent.click(consumeButton);

    expect(mockOnConsume).toHaveBeenCalledTimes(1);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('isConsumingがtrueの場合、消費ボタンが無効化される', () => {
    render(
      <InventoryItem
        item={mockItem}
        onConsume={mockOnConsume}
        onClick={mockOnClick}
        isConsuming={true}
      />
    );

    const consumeButton = screen.getByRole('button', { name: '-1消費' });
    expect(consumeButton).toBeDisabled();
  });

  it('期限切れの在庫は赤背景になる', () => {
    const expiredItem: InventoryItemWithId = {
      ...mockItem,
      expireDate: '2020-01-01', // 過去の日付
    };

    const { container } = render(
      <InventoryItem
        item={expiredItem}
        onConsume={mockOnConsume}
        onClick={mockOnClick}
      />
    );

    // bg-red-50クラスが含まれていることを確認
    const itemContainer = container.firstChild;
    expect(itemContainer).toHaveClass('bg-red-50');
  });

  it('単位なしの場合は「個」がデフォルト表示される', () => {
    const itemWithoutUnit: InventoryItemWithId = {
      ...mockItem,
      quantityUnit: undefined,
    };

    render(
      <InventoryItem
        item={itemWithoutUnit}
        onConsume={mockOnConsume}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText('6個')).toBeInTheDocument();
  });
});
