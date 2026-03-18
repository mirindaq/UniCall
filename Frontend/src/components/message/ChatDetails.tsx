import { useState } from "react"
import ChatInfoMain from "./ChatInfoMain"
import ChatStorage from "./ChatStorage"

export default function ChatDetails() {
  // Trạng thái hiển thị màn hình chính hay màn hình kho lưu trữ
  const [currentView, setCurrentView] = useState<"main" | "storage">("main")
  // Trạng thái tab đang mở trong kho lưu trữ
  const [activeStorageTab, setActiveStorageTab] = useState<
    "images" | "files" | "links"
  >("images")

  // Hàm mở kho lưu trữ và chọn sẵn tab tương ứng
  const handleOpenStorage = (tab: "images" | "files" | "links") => {
    setActiveStorageTab(tab)
    setCurrentView("storage")
  }

  // Render Màn hình Kho lưu trữ
  if (currentView === "storage") {
    return (
      <ChatStorage
        onBack={() => setCurrentView("main")}
        activeTab={activeStorageTab}
        setActiveTab={setActiveStorageTab}
      />
    )
  }

  // Render Màn hình Thông tin Hội thoại (Mặc định)
  return <ChatInfoMain openStorage={handleOpenStorage} />
}
