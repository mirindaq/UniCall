import { ChevronLeft } from "lucide-react"

import StorageFiles from "./StorageFiles"
import StorageImages from "./StorageImages"
import StorageLinks from "./StorageLinks"

interface ChatStorageProps {
  onBack: () => void
  activeTab: "images" | "files" | "links"
  setActiveTab: (tab: "images" | "files" | "links") => void
}

export default function ChatStorage({
  onBack,
  activeTab,
  setActiveTab,
}: ChatStorageProps) {
  return (
    <div className="flex h-full w-[340px] shrink-0 flex-col border-l border-gray-200 bg-white">
      {/* Header Kho lưu trữ */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-4">
        <button
          onClick={onBack}
          className="rounded p-1 text-gray-600 transition hover:bg-gray-100"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="text-base font-semibold text-gray-800">Kho lưu trữ</h2>
        <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Chọn
        </button>
      </div>

      {/* Tabs Kho lưu trữ */}
      <div className="flex shrink-0 border-b border-gray-200 px-2">
        <button
          onClick={() => setActiveTab("images")}
          className={`flex-1 border-b-2 py-3 text-sm font-medium transition-colors ${activeTab === "images" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Ảnh/Video
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`flex-1 border-b-2 py-3 text-sm font-medium transition-colors ${activeTab === "files" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Files
        </button>
        <button
          onClick={() => setActiveTab("links")}
          className={`flex-1 border-b-2 py-3 text-sm font-medium transition-colors ${activeTab === "links" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Links
        </button>
      </div>

      {/* Nội dung cuộn của Kho lưu trữ */}
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {activeTab === "images" && <StorageImages />}
        {activeTab === "files" && <StorageFiles />}
        {activeTab === "links" && <StorageLinks />}
      </div>
    </div>
  )
}
