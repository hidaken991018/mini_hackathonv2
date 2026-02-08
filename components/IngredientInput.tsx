'use client';

import { useState } from 'react';

export type IngredientFormItem = {
  name: string;
  quantityValue: string;
  quantityUnit: string;
};

type IngredientInputProps = {
  ingredients: IngredientFormItem[];
  onChange: (ingredients: IngredientFormItem[]) => void;
};

export default function IngredientInput({ ingredients, onChange }: IngredientInputProps) {
  const handleChange = (index: number, field: keyof IngredientFormItem, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...ingredients, { name: '', quantityValue: '', quantityUnit: '' }]);
  };

  const handleRemove = (index: number) => {
    if (ingredients.length <= 1) return;
    const updated = ingredients.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {ingredients.map((ingredient, index) => (
        <div key={index} className="flex gap-2 items-start">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={ingredient.name}
              onChange={(e) => handleChange(index, 'name', e.target.value)}
              placeholder="材料名"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="w-20">
            <input
              type="text"
              value={ingredient.quantityValue}
              onChange={(e) => handleChange(index, 'quantityValue', e.target.value)}
              placeholder="数量"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="w-16">
            <input
              type="text"
              value={ingredient.quantityUnit}
              onChange={(e) => handleChange(index, 'quantityUnit', e.target.value)}
              placeholder="単位"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <button
            type="button"
            onClick={() => handleRemove(index)}
            disabled={ingredients.length <= 1}
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
        + 材料を追加
      </button>
    </div>
  );
}
