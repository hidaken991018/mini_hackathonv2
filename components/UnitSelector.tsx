'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

/**
 * 在庫管理で使用する単位の一覧（カテゴリ別）
 *
 * ユーザーがドロップダウンから選択できる単位。
 * レシピ専用の計量スプーン（大さじ、小さじ等）や曖昧表現（少々、適量等）は除外。
 */
const UNIT_GROUPS = [
  {
    label: '個数',
    units: ['個', '本', '枚', 'パック', '袋', '房', '束', '玉', '株'],
  },
  {
    label: '重量',
    units: ['g', 'kg'],
  },
  {
    label: '容量',
    units: ['ml', 'L'],
  },
];

/** すべての単位をフラットにしたリスト */
const ALL_UNITS = UNIT_GROUPS.flatMap((group) => group.units);

type UnitSelectorProps = {
  /** 現在選択されている単位 */
  value: string;
  /** 単位が選択されたときのコールバック */
  onChange: (unit: string) => void;
  /** 外側のスタイルクラス */
  className?: string;
  /** プレースホルダー（デフォルト: "単位"） */
  placeholder?: string;
};

/**
 * 単位セレクタ（ドロップダウン + サジェスト付き）
 *
 * - 入力フィールドをクリック/フォーカスするとドロップダウンが開く
 * - テキスト入力でフィルタリング（サジェスト）可能
 * - 選択肢からのみ選べる（自由テキスト入力は不可）
 * - 不正な値で確定しようとした場合は元の値に戻す
 */
export default function UnitSelector({
  value,
  onChange,
  className = '',
  placeholder = '単位',
}: UnitSelectorProps) {
  // ドロップダウンの開閉状態
  const [isOpen, setIsOpen] = useState(false);
  // 入力フィールドに表示するテキスト（フィルタリング用）
  const [inputText, setInputText] = useState(value);
  // キーボードでハイライトされているインデックス
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // 外部から value が変わったら入力テキストも同期
  useEffect(() => {
    if (!isOpen) {
      setInputText(value);
    }
  }, [value, isOpen]);

  // フィルタリングされた単位リスト（カテゴリ付き）
  const filteredGroups = useMemo(() => {
    const query = inputText.toLowerCase().trim();
    if (!query) return UNIT_GROUPS;

    return UNIT_GROUPS.map((group) => ({
      ...group,
      units: group.units.filter((unit) => unit.toLowerCase().includes(query)),
    })).filter((group) => group.units.length > 0);
  }, [inputText]);

  // フィルタリング後のフラットなリスト（キーボード操作用）
  const flatFiltered = useMemo(
    () => filteredGroups.flatMap((g) => g.units),
    [filteredGroups]
  );

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, value]);

  // ハイライトされた項目が表示範囲に入るようスクロール
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-unit]');
      items[highlightIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  /** 単位を選択して閉じる */
  function selectUnit(unit: string) {
    onChange(unit);
    setInputText(unit);
    setIsOpen(false);
    setHighlightIndex(-1);
  }

  /** ドロップダウンを閉じる（不正な入力は元に戻す） */
  function handleClose() {
    // 入力テキストが有効な単位であれば確定、そうでなければ元の値に戻す
    if (ALL_UNITS.includes(inputText)) {
      onChange(inputText);
    } else {
      setInputText(value);
    }
    setIsOpen(false);
    setHighlightIndex(-1);
  }

  /** キーボード操作 */
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < flatFiltered.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : flatFiltered.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < flatFiltered.length) {
          selectUnit(flatFiltered[highlightIndex]);
        } else if (flatFiltered.length === 1) {
          // フィルタ結果が1つだけならそれを選択
          selectUnit(flatFiltered[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;
      case 'Tab':
        handleClose();
        break;
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 入力フィールド */}
      <input
        ref={inputRef}
        type="text"
        value={inputText}
        onChange={(e) => {
          setInputText(e.target.value);
          setHighlightIndex(-1);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => {
          setIsOpen(true);
          // フォーカス時にテキストを全選択して上書きしやすくする
          inputRef.current?.select();
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
        autoComplete="off"
      />

      {/* ドロップダウンの開閉インジケーター（小さい三角マーク） */}
      <div
        className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
        aria-hidden
      >
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isOpen ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
          />
        </svg>
      </div>

      {/* ドロップダウンリスト */}
      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto"
          role="listbox"
        >
          {filteredGroups.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gray-400">
              該当する単位がありません
            </li>
          ) : (
            filteredGroups.map((group) => (
              <li key={group.label}>
                {/* カテゴリヘッダー */}
                <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 sticky top-0">
                  {group.label}
                </div>
                {/* 単位リスト */}
                {group.units.map((unit) => {
                  const flatIdx = flatFiltered.indexOf(unit);
                  const isHighlighted = flatIdx === highlightIndex;
                  const isSelected = unit === value;

                  return (
                    <div
                      key={unit}
                      data-unit={unit}
                      role="option"
                      aria-selected={isSelected}
                      className={`px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                        isHighlighted
                          ? 'bg-emerald-50 text-emerald-700'
                          : isSelected
                            ? 'bg-emerald-50/50 text-emerald-600 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onMouseDown={(e) => {
                        // mousedown で選択（blur より先に発火させる）
                        e.preventDefault();
                        selectUnit(unit);
                      }}
                      onMouseEnter={() => setHighlightIndex(flatIdx)}
                    >
                      {unit}
                      {isSelected && (
                        <span className="float-right text-emerald-500">
                          ✓
                        </span>
                      )}
                    </div>
                  );
                })}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
