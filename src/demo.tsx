"use client"

import { useRef, useState } from "react"
import SelectableText, { type SelectableTextHandle, type HighlightRange } from "./selectable-text"

export default function TextHighlightDemo() {
  const textRef = useRef<SelectableTextHandle>(null)
  const [highlights, setHighlights] = useState<HighlightRange[]>([
    { start: 5, end: 10, color: "#ffeb3b80" },
    { start: 20, end: 30, color: "#4caf5080" },
  ])
  const [manualStart, setManualStart] = useState<number>(0)
  const [manualEnd, setManualEnd] = useState<number>(0)
  const [manualColor, setManualColor] = useState<string>("#ff980080")

  const handleClearSelection = () => {
    textRef.current?.clearSelection()
  }

  const handleClearHighlights = () => {
    textRef.current?.clearHighlights()
    setHighlights([])
  }

  const handleGetSelectedText = () => {
    const selectedText = textRef.current?.getSelectedText()
    alert(`Selected text: ${selectedText}`)
  }

  const handleAddManualHighlight = () => {
    if (manualStart < manualEnd) {
      const newHighlight: HighlightRange = {
        start: manualStart,
        end: manualEnd,
        color: manualColor,
      }

      textRef.current?.addHighlight(newHighlight)
      setHighlights((prev) => [...prev, newHighlight])
    } else {
      alert("Start index must be less than end index")
    }
  }

  const handleTextSelect = (range: HighlightRange) => {
    console.log("Selected text range:", range)
    setHighlights((prev) => [...prev, range])
  }

  return (
    <div className="p-6 max-w-2xl mx-auto bg-gray-50 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">テキスト選択ハイライター</h1>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">手動でハイライト追加</h2>
        <div className="flex flex-wrap gap-3 mb-3">
          <div>
            <label className="block text-sm mb-1">開始位置</label>
            <input
              type="number"
              value={manualStart}
              onChange={(e) => setManualStart(Number.parseInt(e.target.value))}
              className="w-20 p-1 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">終了位置</label>
            <input
              type="number"
              value={manualEnd}
              onChange={(e) => setManualEnd(Number.parseInt(e.target.value))}
              className="w-20 p-1 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">色</label>
            <input
              type="color"
              value={manualColor}
              onChange={(e) => setManualColor(e.target.value)}
              className="w-20 p-1 border rounded h-8"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddManualHighlight}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              追加
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-sm text-gray-600">
          下記のテキストを選択するとハイライトされます。また、指定したインデックスでもハイライトされています。
        </p>

        <SelectableText
          ref={textRef}
          defaultHighlightColor="#ffeb3b80"
          className="p-4 border rounded bg-white"
          highlights={highlights}
          onTextSelect={handleTextSelect}
        >
          <p className="mb-3">
            これはテキスト選択のデモです。このテキストを選択すると、選択された部分がハイライトされます。
            前方向（左から右）でも後方向（右から左）でも正常に動作します。
          </p>
          <p className="mb-3">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl
            nisl aliquam nisl, eget ultricies nisl nisl eget nisl. Nullam auctor, nisl eget ultricies tincidunt.
          </p>
          <p>
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem
            aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
          </p>
        </SelectableText>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleClearSelection}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          選択解除
        </button>
        <button
          onClick={handleClearHighlights}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          ハイライト全削除
        </button>
        <button
          onClick={handleGetSelectedText}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          選択テキストを取得
        </button>
      </div>

      <div className="mt-6 p-3 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">現在のハイライト:</h3>
        <ul className="list-disc pl-5">
          {highlights.map((highlight, index) => (
            <li key={index}>
              開始: {highlight.start}, 終了: {highlight.end}, 色:{" "}
              <span className="inline-block w-4 h-4 align-middle" style={{ backgroundColor: highlight.color }}></span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

