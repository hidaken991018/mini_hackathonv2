'use client';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

export default function ChatInput({ value, onChange, onSend }: ChatInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="fixed bottom-20 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 py-3 shadow-lg">
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="メッセージを入力..."
          className="flex-1 min-h-[44px] max-h-32 px-4 py-2.5 bg-white border border-gray-200 rounded-2xl resize-none outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 text-gray-900 placeholder-gray-400 text-sm"
          rows={1}
        />
        <button
          onClick={onSend}
          disabled={!value.trim()}
          className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
          aria-label="送信"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
