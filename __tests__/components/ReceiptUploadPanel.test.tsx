import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReceiptUploadPanel from '@/components/ReceiptUploadPanel';

jest.mock('@/lib/axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock('@/components/InventoryManualAddModal', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>manual-add-modal</div> : null,
}));

class MockFileReader {
  result: string | ArrayBuffer | null = 'data:image/jpeg;base64,mock';
  onloadend: (() => void) | null = null;

  readAsDataURL() {
    if (this.onloadend) {
      this.onloadend();
    }
  }
}

describe('ReceiptUploadPanel', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    global.fetch = jest.fn();
    Object.defineProperty(global, 'FileReader', {
      writable: true,
      value: MockFileReader,
    });
  });

  it('手動追加ボタンを常時表示する', () => {
    render(<ReceiptUploadPanel />);
    expect(
      screen.getByRole('button', { name: '在庫を手動で追加' })
    ).toBeInTheDocument();
  });

  it('OCRで食材が抽出できない場合に手動入力フォールバックを表示する', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { items: [] },
      }),
    });

    const { container } = render(<ReceiptUploadPanel />);
    const receiptInput = container.querySelector(
      'input[type="file"][multiple]'
    ) as HTMLInputElement;
    const file = new File(['dummy'], 'receipt.jpg', { type: 'image/jpeg' });

    fireEvent.change(receiptInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(
          'レシートから食材を抽出できませんでした。手動入力してください。'
        )
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '手動入力する' }));
    expect(screen.getByText('manual-add-modal')).toBeInTheDocument();
  });
});
