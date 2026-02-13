import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import InventoryManualAddModal from '@/components/InventoryManualAddModal';
import axiosInstance from '@/lib/axios';

jest.mock('@/lib/axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

describe('InventoryManualAddModal', () => {
  const postMock = axiosInstance.post as jest.Mock;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    postMock.mockReset();
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('手動追加で在庫を1件登録する', async () => {
    postMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          createdCount: 1,
          inventories: [
            {
              id: 'inv-1',
              name: '卵',
              quantityValue: 6,
              quantityUnit: '個',
              createdAt: '2026-02-12T00:00:00.000Z',
              updatedAt: '2026-02-12T00:00:00.000Z',
            },
          ],
        },
      },
    });

    const onClose = jest.fn();

    render(<InventoryManualAddModal isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('例: 卵'), {
      target: { value: '卵' },
    });
    fireEvent.change(screen.getByPlaceholderText('1'), {
      target: { value: '6' },
    });

    fireEvent.click(screen.getByRole('button', { name: '在庫に追加' }));

    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    expect(postMock).toHaveBeenCalledWith('/api/inventories/bulk', {
      items: [
        expect.objectContaining({
          name: '卵',
          quantityValue: 6,
        }),
      ],
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
