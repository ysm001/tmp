/** @format */

'use client';

import type React from 'react';
import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';

// Define the interface for highlight ranges
export interface HighlightRange {
  start: number;
  end: number;
  color?: string;
}

// Define the interface for the component props
interface SelectableTextProps {
  children: React.ReactNode;
  defaultHighlightColor?: string;
  className?: string;
  highlights?: HighlightRange[];
  onTextSelect?: (range: HighlightRange) => void;
}

// Define the interface for the imperative handle
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
      defaultHighlightColor = '#ffeb3b80',
      className = '',
      highlights = [],
      onTextSelect,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textContentRef = useRef<string>('');
    const [appliedHighlights, setAppliedHighlights] = useState<HighlightRange[]>([]);

    // Process text content when component mounts or children change
    useEffect(() => {
      if (containerRef.current) {
        // Store the text content for index calculations
        textContentRef.current = containerRef.current.textContent || '';
      }
    }, [children]);

    // Apply highlights when highlights prop changes
    useEffect(() => {
      if (highlights.length > 0) {
        // Clear existing highlights first
        clearAllHighlights();

        // Apply new highlights
        setAppliedHighlights(highlights);
        highlights.forEach((range) => {
          applyHighlightByIndices(range.start, range.end, range.color || defaultHighlightColor);
        });
      }
    }, [highlights, defaultHighlightColor]);

    // Expose methods via the ref
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
          const newHighlight = {
            start: range.start,
            end: range.end,
            color: range.color || defaultHighlightColor,
          };

          setAppliedHighlights((prev) => [...prev, newHighlight]);
          applyHighlightByIndices(range.start, range.end, newHighlight.color);
        },
        clearHighlights: () => {
          clearAllHighlights();
          setAppliedHighlights([]);
        },
      }),
      [defaultHighlightColor]
    );

    // Clear all highlights
    const clearAllHighlights = () => {
      if (containerRef.current) {
        const highlights = containerRef.current.querySelectorAll('.highlighted-text');
        highlights.forEach((highlight) => {
          const parent = highlight.parentNode;
          if (parent) {
            // Move all children out of the highlight span
            while (highlight.firstChild) {
              parent.insertBefore(highlight.firstChild, highlight);
            }
            // Remove the empty highlight span
            parent.removeChild(highlight);
          }
        });
      }
    };

    // Handle text selection
    const handleSelection = () => {
      const selection = window.getSelection();

      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return;
      }

      // Get the current selection range
      const range = selection.getRangeAt(0);

      // Check if the selection is within our component
      if (containerRef.current && containerRef.current.contains(range.commonAncestorContainer)) {
        // Calculate start and end indices
        const indices = getIndicesFromRange(range);
        if (indices) {
          const newHighlight: HighlightRange = {
            start: indices.start,
            end: indices.end,
            color: defaultHighlightColor,
          };

          // Add to applied highlights
          setAppliedHighlights((prev) => [...prev, newHighlight]);

          // Apply highlighting
          applyHighlightByRange(range, defaultHighlightColor);

          // Call the callback if provided
          if (onTextSelect) {
            onTextSelect(newHighlight);
          }
        }
      }
    };

    // Get start and end indices from a DOM Range
    const getIndicesFromRange = (range: Range): HighlightRange | null => {
      if (!containerRef.current || !textContentRef.current) return null;

      const fullText = textContentRef.current;
      const containerRange = document.createRange();
      containerRange.selectNodeContents(containerRef.current);

      // Calculate start index
      const startRange = document.createRange();
      startRange.setStart(containerRange.startContainer, containerRange.startOffset);
      startRange.setEnd(range.startContainer, range.startOffset);
      const startIndex = startRange.toString().length;

      // Calculate end index
      const endRange = document.createRange();
      endRange.setStart(containerRange.startContainer, containerRange.startOffset);
      endRange.setEnd(range.endContainer, range.endOffset);
      const endIndex = endRange.toString().length;

      return { start: startIndex, end: endIndex };
    };

    // Apply highlighting to a DOM Range
    const applyHighlightByRange = (range: Range, color: string) => {
      if (!range) return;

      // Create a span element for highlighting
      const highlightSpan = document.createElement('span');
      highlightSpan.style.backgroundColor = color;
      highlightSpan.className = 'highlighted-text';

      try {
        // Surround the selected content with the highlight span
        range.surroundContents(highlightSpan);
      } catch (e) {
        console.error('Failed to highlight selection:', e);
      }
    };

    // Apply highlighting based on start and end indices
    const applyHighlightByIndices = (start: number, end: number, color: string) => {
      if (!containerRef.current || start >= end) return;

      // Get all text nodes in the container
      const textNodes: Node[] = [];
      const walker = document.createTreeWalker(containerRef.current, NodeFilter.SHOW_TEXT, null);

      let node;
      while ((node = walker.nextNode())) {
        textNodes.push(node);
      }

      let currentIndex = 0;
      let startNode: Node | null = null;
      let startOffset = 0;
      let endNode: Node | null = null;
      let endOffset = 0;

      // Find the nodes and offsets for the start and end indices
      for (const node of textNodes) {
        const nodeLength = node.textContent?.length || 0;

        // Check if start index is in this node
        if (startNode === null && start >= currentIndex && start < currentIndex + nodeLength) {
          startNode = node;
          startOffset = start - currentIndex;
        }

        // Check if end index is in this node
        if (endNode === null && end >= currentIndex && end <= currentIndex + nodeLength) {
          endNode = node;
          endOffset = end - currentIndex;
          break;
        }

        currentIndex += nodeLength;
      }

      // Apply highlight if we found both start and end nodes
      if (startNode && endNode) {
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        applyHighlightByRange(range, color);
      }
    };

    // Clean up highlights when component unmounts
    useEffect(() => {
      return () => {
        clearAllHighlights();
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className={`selectable-text-container ${className}`}
        onMouseUp={handleSelection}
        onTouchEnd={handleSelection}
        style={{ position: 'relative', userSelect: 'text' }}
      >
        {children}
      </div>
    );
  }
);

SelectableText.displayName = 'SelectableText';

export default SelectableText;
