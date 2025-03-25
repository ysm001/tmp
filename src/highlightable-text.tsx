/** @format */

'use client';

import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';

// ハイライト範囲のインターフェース
export interface HighlightRange {
  start: number;
  end: number;
}

// コンポーネントのプロップス
interface SelectableTextProps {
  children: string;
  className?: string;
  highlights?: HighlightRange[];
  onTextSelect?: (range: HighlightRange) => void;
  showTooltip?: boolean;
  tooltipText?: string;
}

// 外部から呼び出せるメソッド
export interface SelectableTextHandle {
  clearSelection: () => void;
  getSelectedText: () => string;
  addHighlight: (range: HighlightRange) => void;
  clearHighlights: () => void;
}

const SelectableText = forwardRef<SelectableTextHandle, SelectableTextProps>(
  (
    {
      children,
      className = '',
      highlights = [],
      onTextSelect,
      showTooltip = true,
      tooltipText = '報告あり',
    },
    ref
  ) => {
    const [text, setText] = useState<string>('');
    const [internalHighlights, setInternalHighlights] = useState<HighlightRange[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [lineElements, setLineElements] = useState<HTMLElement[]>([]);
    const [highlightedLines, setHighlightedLines] = useState<Set<number>>(new Set());

    // テキストコンテンツを設定
    useEffect(() => {
      if (typeof children === 'string') {
        setText(children);
      } else {
        console.error('SelectableText only supports string children');
      }
    }, [children]);

    // 外部ハイライトが変更されたときに内部ハイライトを更新
    useEffect(() => {
      setInternalHighlights((prev) => {
        // 外部ハイライトと内部ハイライトをマージ
        const merged = [...prev];

        // 新しい外部ハイライトを追加
        highlights.forEach((highlight) => {
          // 既存のハイライトと重複していないか確認
          const exists = merged.some((h) => h.start === highlight.start && h.end === highlight.end);

          if (!exists) {
            merged.push(highlight);
          }
        });

        return merged;
      });
    }, [highlights]);

    // テキスト選択時の処理
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return;
      }

      const range = selection.getRangeAt(0);
      if (!containerRef.current || !containerRef.current.contains(range.commonAncestorContainer)) {
        return;
      }

      // 選択範囲のテキストを取得
      const selectedText = selection.toString();
      if (!selectedText) return;

      // 選択範囲の開始位置を計算
      const fullText = text;
      const preSelectionRange = document.createRange();
      preSelectionRange.selectNodeContents(containerRef.current);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const startOffset = preSelectionRange.toString().length;

      // 選択範囲の終了位置を計算
      const endOffset = startOffset + selectedText.length;

      // 新しいハイライト範囲を作成
      const newHighlight: HighlightRange = {
        start: startOffset,
        end: endOffset,
      };

      // 内部ハイライトに追加
      setInternalHighlights((prev) => [...prev, newHighlight]);

      // コールバックを呼び出し
      if (onTextSelect) {
        onTextSelect(newHighlight);
      }
    };

    // 外部から呼び出せるメソッドを定義
    useImperativeHandle(
      ref,
      () => ({
        clearSelection: () => {
          window.getSelection()?.removeAllRanges();
        },
        getSelectedText: () => {
          return window.getSelection()?.toString() || '';
        },
        addHighlight: (range: HighlightRange) => {
          setInternalHighlights((prev) => [...prev, range]);
        },
        clearHighlights: () => {
          setInternalHighlights([]);
        },
      }),
      []
    );

    // テキストをハイライト付きでレンダリング
    const renderHighlightedText = () => {
      if (!text) return null;

      // ハイライトがない場合はそのままテキストを返す
      if (internalHighlights.length === 0) {
        return text;
      }

      // ハイライト範囲の境界点を収集
      const boundaries = new Set<number>();
      boundaries.add(0);
      boundaries.add(text.length);

      internalHighlights.forEach((range) => {
        if (range.start >= 0 && range.start <= text.length) {
          boundaries.add(range.start);
        }
        if (range.end >= 0 && range.end <= text.length) {
          boundaries.add(range.end);
        }
      });

      // 境界点を昇順にソート
      const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);

      // 各境界点間のテキストセグメントを作成してレンダリング
      const segments = [];
      for (let i = 0; i < sortedBoundaries.length - 1; i++) {
        const start = sortedBoundaries[i];
        const end = sortedBoundaries[i + 1];
        const segmentText = text.substring(start, end);

        // このセグメントがハイライトされるかチェック
        const isHighlighted = internalHighlights.some(
          (range) => start >= range.start && end <= range.end
        );

        segments.push(
          <span
            key={`segment-${start}-${end}`}
            data-highlighted={isHighlighted ? 'true' : 'false'}
            data-start={start}
            data-end={end}
            style={isHighlighted ? { backgroundColor: '#ffeb3b80' } : undefined}
          >
            {segmentText}
          </span>
        );
      }

      return segments;
    };

    // レンダリング後に行を検出してツールチップを配置
    useEffect(() => {
      if (!containerRef.current || !showTooltip) return;

      // 既存のツールチップを削除
      const existingTooltips = document.querySelectorAll('.line-tooltip');
      existingTooltips.forEach((tooltip) => tooltip.remove());

      // テキストの行を検出
      const detectLines = () => {
        if (!containerRef.current) return;

        // 行の検出に使用する一時的な要素
        const lineDetector = document.createElement('span');
        lineDetector.style.visibility = 'hidden';
        lineDetector.style.position = 'absolute';
        lineDetector.style.whiteSpace = 'nowrap';
        lineDetector.textContent = 'X'; // 高さ測定用のダミーテキスト
        containerRef.current.appendChild(lineDetector);

        const lineHeight = lineDetector.offsetHeight;
        containerRef.current.removeChild(lineDetector);

        // ハイライトされたセグメントを取得
        const highlightedSegments = containerRef.current.querySelectorAll(
          '[data-highlighted="true"]'
        );

        // 各ハイライトセグメントの行を特定
        const lineMap = new Map<number, HTMLElement[]>();

        highlightedSegments.forEach((segment) => {
          const rect = segment.getBoundingClientRect();
          const containerRect = containerRef.current!.getBoundingClientRect();

          // セグメントの上端から行番号を計算
          const relativeTop = rect.top - containerRect.top;
          const lineIndex = Math.floor(relativeTop / lineHeight);

          if (!lineMap.has(lineIndex)) {
            lineMap.set(lineIndex, []);
          }

          lineMap.get(lineIndex)!.push(segment as HTMLElement);
        });

        // 各行にツールチップを追加
        lineMap.forEach((segments, lineIndex) => {
          // 行の最初のセグメントを基準にツールチップを配置
          const firstSegment = segments[0];
          const rect = firstSegment.getBoundingClientRect();
          const containerRect = containerRef.current!.getBoundingClientRect();

          // ツールチップを作成
          const tooltip = document.createElement('div');
          tooltip.className = 'line-tooltip';
          tooltip.textContent = tooltipText;
          tooltip.style.position = 'absolute';
          tooltip.style.left = `${containerRect.width + 10}px`; // コンテナの右端から10px
          tooltip.style.top = `${lineIndex * lineHeight + lineHeight / 2 - 10}px`; // 行の中央
          tooltip.style.backgroundColor = '#333';
          tooltip.style.color = 'white';
          tooltip.style.padding = '2px 6px';
          tooltip.style.borderRadius = '4px';
          tooltip.style.fontSize = '12px';
          tooltip.style.whiteSpace = 'nowrap';
          tooltip.style.zIndex = '10';

          containerRef.current!.appendChild(tooltip);
        });
      };

      // 初回検出
      setTimeout(detectLines, 100);

      // ウィンドウサイズ変更時に再検出
      const handleResize = () => {
        // 既存のツールチップを削除
        const existingTooltips = document.querySelectorAll('.line-tooltip');
        existingTooltips.forEach((tooltip) => tooltip.remove());

        // 行を再検出
        detectLines();
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);

        // コンポーネントのアンマウント時にツールチップを削除
        const existingTooltips = document.querySelectorAll('.line-tooltip');
        existingTooltips.forEach((tooltip) => tooltip.remove());
      };
    }, [internalHighlights, showTooltip, tooltipText]);

    return (
      <div
        ref={containerRef}
        className={`selectable-text-container ${className}`}
        onMouseUp={handleSelection}
        onTouchEnd={handleSelection}
        style={{
          position: 'relative',
          userSelect: 'text',
          lineHeight: '1.5',
          wordWrap: 'break-word',
        }}
      >
        {renderHighlightedText()}
      </div>
    );
  }
);

SelectableText.displayName = 'SelectableText';

export default SelectableText;
