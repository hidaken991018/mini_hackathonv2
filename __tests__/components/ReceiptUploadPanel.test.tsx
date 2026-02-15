import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReceiptUploadPanel from '@/components/ReceiptUploadPanel';
import axiosInstance from '@/lib/axios';

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
  const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>;

  beforeEach(() => {
    jest.restoreAllMocks();
    mockedAxios.post.mockReset();
    Object.defineProperty(global, 'FileReader', {
      writable: true,
      value: MockFileReader,
    });
  });

  it('初期表示は + ボタンのみを表示する', () => {
    render(<ReceiptUploadPanel />);
    expect(
      screen.getByRole('button', { name: '在庫入力メニューを開く' })
    ).toBeInTheDocument();
    expect(screen.queryByText('カメラで撮影')).not.toBeInTheDocument();
    expect(screen.queryByText('レシートを読み取る')).not.toBeInTheDocument();
    expect(screen.queryByText('手動で追加')).not.toBeInTheDocument();
  });

  it('+ ボタン押下でアクションシートを開く', () => {
    render(<ReceiptUploadPanel />);
    fireEvent.click(screen.getByRole('button', { name: '在庫入力メニューを開く' }));

    expect(screen.getByText('カメラで撮影')).toBeInTheDocument();
    expect(screen.getByText('レシートを読み取る')).toBeInTheDocument();
    expect(screen.getByText('手動で追加')).toBeInTheDocument();
  });

  it('レシート選択でレシートinputを開く', () => {
    const { container } = render(<ReceiptUploadPanel />);
    const receiptInput = container.querySelector(
      'input[type="file"][multiple]'
    ) as HTMLInputElement;
    const receiptClickSpy = jest
      .spyOn(receiptInput, 'click')
      .mockImplementation(() => {});

    fireEvent.click(screen.getByRole('button', { name: '在庫入力メニューを開く' }));
    fireEvent.click(screen.getByRole('button', { name: 'レシートを読み取る' }));

    expect(receiptClickSpy).toHaveBeenCalledTimes(1);
  });

  it('カメラ選択でカメラinputを開く', () => {
    const { container } = render(<ReceiptUploadPanel />);
    const cameraInput = container.querySelector(
      'input[type="file"][capture="environment"]'
    ) as HTMLInputElement;
    const cameraClickSpy = jest
      .spyOn(cameraInput, 'click')
      .mockImplementation(() => {});

    fireEvent.click(screen.getByRole('button', { name: '在庫入力メニューを開く' }));
    fireEvent.click(screen.getByRole('button', { name: 'カメラで撮影' }));

    expect(cameraClickSpy).toHaveBeenCalledTimes(1);
  });

  it('手入力選択で手動追加モーダルを開く', () => {
    render(<ReceiptUploadPanel />);
    fireEvent.click(screen.getByRole('button', { name: '在庫入力メニューを開く' }));
    fireEvent.click(screen.getByRole('button', { name: '手動で追加' }));
    expect(screen.getByText('manual-add-modal')).toBeInTheDocument();
  });

  it('OCRで食材が抽出できない場合に手動入力フォールバックを表示する', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        success: true,
        data: { items: [] },
      },
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
