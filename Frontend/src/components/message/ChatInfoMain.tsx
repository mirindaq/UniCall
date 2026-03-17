import {
  AlertTriangle,
  BellOff,
  ChevronDown,
  Clock,
  Edit2,
  EyeOff,
  HelpCircle,
  Link as LinkIcon,
  Pin,
  Trash2,
  Users,
} from "lucide-react"
import { useState } from "react"

interface ChatInfoMainProps {
  openStorage: (tab: "images" | "files" | "links") => void
}

export default function ChatInfoMain({ openStorage }: ChatInfoMainProps) {
  const [isOpenImages, setIsOpenImages] = useState(true)
  const [isOpenFiles, setIsOpenFiles] = useState(true)
  const [isOpenLinks, setIsOpenLinks] = useState(true)
  const [isOpenSecurity, setIsOpenSecurity] = useState(true)

  return (
    // Container ngoài cùng dùng flex-col, overflow-hidden để con bên trong tự cuộn
    <div className="flex h-full w-[340px] shrink-0 flex-col border-l border-gray-200 bg-white">
      {/* HEADER CỐ ĐỊNH "Thông tin hội thoại" */}
      <div className="flex shrink-0 items-center justify-center border-b border-gray-200 px-4 py-5">
        <h2 className="text-base font-semibold text-gray-800">
          Thông tin hội thoại
        </h2>
      </div>

      {/* PHẦN NỘI DUNG CUỘN */}
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {/* Phần Avatar và Các nút */}
        <div className="flex flex-col items-center border-b border-gray-100 p-4">
          <img
            src="https://avatarngau.sbs/wp-content/uploads/2025/05/avatar-phong-canh-17.jpg"
            alt="Avatar"
            className="mb-2 h-16 w-16 rounded-full"
          />
          <div className="flex gap-2">
            <h4 className="ml-8 text-base font-medium">Nguyễn Đức Hùng</h4>
            <button
              className="rounded-full bg-gray-100 p-1.5 transition hover:bg-gray-200"
              title="Sửa biệt danh"
            >
              <Edit2 className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>

          <div className="mt-4 flex w-full justify-center gap-6">
            <div className="group flex cursor-pointer flex-col items-center gap-1">
              <div className="rounded-full bg-gray-100 p-2.5 group-hover:bg-gray-200">
                <BellOff className="h-4 w-4 text-gray-700" />
              </div>
              <span className="text-xs text-gray-600">Tắt thông báo</span>
            </div>
            <div className="group flex cursor-pointer flex-col items-center gap-1">
              <div className="rounded-full bg-gray-100 p-2.5 group-hover:bg-gray-200">
                <Pin className="h-4 w-4 text-gray-700" />
              </div>
              <span className="text-xs text-gray-600">Ghim hội thoại</span>
            </div>
            <div className="group flex cursor-pointer flex-col items-center gap-1">
              <div className="rounded-full bg-gray-100 p-2.5 group-hover:bg-gray-200">
                <Users className="h-4 w-4 text-gray-700" />
              </div>
              <span className="text-xs text-gray-600">Tạo nhóm</span>
            </div>
          </div>
        </div>

        {/* Các Accordions (Ảnh, File, Link...) */}
        <div className="flex flex-col divide-y divide-gray-100">
          {/* Ảnh/Video */}
          <div className="p-4">
            <div
              className="mb-3 flex cursor-pointer items-center justify-between"
              onClick={() => setIsOpenImages(!isOpenImages)}
            >
              <h5 className="text-sm font-semibold text-gray-800">Ảnh/Video</h5>
              <ChevronDown
                className={`h-4 w-4 text-gray-500 transition-transform ${isOpenImages ? "" : "-rotate-90"}`}
              />
            </div>
            {isOpenImages && (
              <div className="animate-in duration-200 fade-in slide-in-from-top-2">
                <div className="mb-3 grid grid-cols-3 gap-1">
                  <img
                    src="https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=150&h=150&fit=crop"
                    alt="Hình 1"
                    className="aspect-square w-full rounded object-cover"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=150&h=150&fit=crop"
                    alt="Hình 2"
                    className="aspect-square w-full rounded object-cover"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=150&h=150&fit=crop"
                    alt="Hình 3"
                    className="aspect-square w-full rounded object-cover"
                  />
                </div>
                <button
                  onClick={() => openStorage("images")}
                  className="w-full rounded bg-gray-100 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                >
                  Xem tất cả
                </button>
              </div>
            )}
          </div>

          {/* File */}
          <div className="p-4">
            <div
              className="mb-3 flex cursor-pointer items-center justify-between"
              onClick={() => setIsOpenFiles(!isOpenFiles)}
            >
              <h5 className="text-sm font-semibold text-gray-800">File</h5>
              <ChevronDown
                className={`h-4 w-4 text-gray-500 transition-transform ${isOpenFiles ? "" : "-rotate-90"}`}
              />
            </div>
            {isOpenFiles && (
              <div className="animate-in duration-200 fade-in slide-in-from-top-2">
                <div className="mb-3 space-y-3">
                  {[
                    {
                      name: "NhomKTPM.docx",
                      size: "276 KB",
                      time: "Hôm qua",
                      icon: "DOCX",
                      color: "bg-blue-500",
                    },
                    {
                      name: "hehe.docx",
                      size: "624 KB",
                      time: "09/03/2026",
                      icon: "DOCX",
                      color: "bg-blue-500",
                    },
                    {
                      name: "project.mpp",
                      size: "242.5 KB",
                      time: "09/03/2026",
                      icon: "MPP",
                      color: "bg-[#42a5f5]",
                    },
                  ].map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded ${file.color} p-2 text-[10px] font-bold text-white`}
                      >
                        {file.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-gray-800">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <span>{file.size}</span>
                          <Clock className="ml-1 h-3 w-3 text-blue-500" />
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-gray-500">
                        {file.time}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => openStorage("files")}
                  className="w-full rounded bg-gray-100 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                >
                  Xem tất cả
                </button>
              </div>
            )}
          </div>

          {/* Link */}
          <div className="p-4">
            <div
              className="mb-3 flex cursor-pointer items-center justify-between"
              onClick={() => setIsOpenLinks(!isOpenLinks)}
            >
              <h5 className="text-sm font-semibold text-gray-800">Link</h5>
              <ChevronDown
                className={`h-4 w-4 text-gray-500 transition-transform ${isOpenLinks ? "" : "-rotate-90"}`}
              />
            </div>
            {isOpenLinks && (
              <div className="animate-in duration-200 fade-in slide-in-from-top-2">
                <div className="mb-3 space-y-3">
                  {[
                    {
                      title: "https://vt.tiktok.com/ZSuPFP46c/",
                      sub: "vt.tiktok.com",
                      time: "14/03",
                      icon: "link",
                    },
                    {
                      title: "https://drive.google.com/drive/folder...",
                      sub: "drive.google.com",
                      time: "13/03",
                      icon: "drive",
                    },
                  ].map((link, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                        {link.icon === "link" ? (
                          <LinkIcon className="h-4 w-4 text-gray-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-sm bg-green-500"></div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-gray-800">
                          {link.title}
                        </p>
                        <a
                          href="#"
                          className="block truncate text-xs text-blue-500 hover:underline"
                        >
                          {link.sub}
                        </a>
                      </div>
                      <span className="shrink-0 text-xs text-gray-500">
                        {link.time}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => openStorage("links")}
                  className="w-full rounded bg-gray-100 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                >
                  Xem tất cả
                </button>
              </div>
            )}
          </div>

          {/* Thiết lập bảo mật */}
          <div className="p-4">
            <div
              className="mb-3 flex cursor-pointer items-center justify-between"
              onClick={() => setIsOpenSecurity(!isOpenSecurity)}
            >
              <h5 className="text-sm font-semibold text-gray-800">
                Thiết lập bảo mật
              </h5>
              <ChevronDown
                className={`h-4 w-4 text-gray-500 transition-transform ${isOpenSecurity ? "" : "-rotate-90"}`}
              />
            </div>
            {isOpenSecurity && (
              <div className="mt-2 animate-in space-y-4 duration-200 fade-in slide-in-from-top-2">
                <div className="flex cursor-pointer items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-gray-800">Tin nhắn tự xóa</p>
                      <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500">Không bao giờ</p>
                  </div>
                </div>
                <div className="flex cursor-pointer items-center justify-between">
                  <div className="flex items-center gap-3">
                    <EyeOff className="h-5 w-5 text-gray-600" />
                    <p className="text-sm text-gray-800">Ẩn trò chuyện</p>
                  </div>
                  <div className="relative h-4 w-8 rounded-full bg-gray-300 transition-colors">
                    <div className="absolute top-0 left-0 h-4 w-4 rounded-full border border-gray-200 bg-white shadow transition-transform"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 p-4">
            <div className="-ml-1 flex cursor-pointer items-center gap-3 rounded p-1 transition hover:bg-gray-50">
              <AlertTriangle className="h-5 w-5 text-gray-600" />
              <p className="text-sm text-gray-800">Báo xấu</p>
            </div>
            <div className="-ml-1 flex cursor-pointer items-center gap-3 rounded p-1 transition hover:bg-red-50">
              <Trash2 className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-500">Xoá lịch sử trò chuyện</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
