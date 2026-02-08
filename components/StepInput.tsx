'use client';

export type StepFormItem = {
  instruction: string;
};

type StepInputProps = {
  steps: StepFormItem[];
  onChange: (steps: StepFormItem[]) => void;
};

export default function StepInput({ steps, onChange }: StepInputProps) {
  const handleChange = (index: number, value: string) => {
    const updated = [...steps];
    updated[index] = { instruction: value };
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...steps, { instruction: '' }]);
  };

  const handleRemove = (index: number) => {
    if (steps.length <= 1) return;
    const updated = steps.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div key={index} className="flex gap-2 items-start">
          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <textarea
              value={step.instruction}
              onChange={(e) => handleChange(index, e.target.value)}
              placeholder="調理手順を入力"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>
          <button
            type="button"
            onClick={() => handleRemove(index)}
            disabled={steps.length <= 1}
            className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 text-sm hover:border-gray-400 hover:text-gray-600 transition-colors"
      >
        + 手順を追加
      </button>
    </div>
  );
}
