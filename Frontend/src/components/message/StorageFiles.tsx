import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Search,
} from "lucide-react"

export default function StorageFiles() {
  return (
    <div className="flex flex-col">
      {/* Filter */}
      <div className="p-3 pb-2">
        <div className="relative mb-3 flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm File"
            className="w-full rounded-full border border-gray-300 bg-white py-1.5 pr-4 pl-9 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-1 whitespace-nowrap">
          <button className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
            Loại <ChevronDown className="h-4 w-6" />
          </button>
          <button className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
            Người gửi <ChevronDown className="h-4 w-5" />
          </button>
          <button className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
            Ngày gửi <ChevronDown className="h-4 w-5" />
          </button>
        </div>
      </div>

      {/* Group Ngày 16 Tháng 3 */}
      <div className="mt-2 px-3">
        <h4 className="mb-2 text-sm font-medium text-gray-800">
          Ngày 16 Tháng 3
        </h4>
        <div className="flex items-center gap-3 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-blue-500 p-2 text-lg font-bold text-white">
            W
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-gray-800">NhomKTPM.docx</p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>276 KB</span>
              <Clock className="ml-1 h-3 w-3 text-blue-500" />
              <span className="text-blue-500">Tải về để xem lâu dài</span>
            </div>
          </div>
        </div>
      </div>

      {/* Group Ngày 09 Tháng 3 */}
      <div className="mt-2 border-t border-gray-100 px-3 pt-2">
        <h4 className="mb-2 text-sm font-medium text-gray-800">
          Ngày 09 Tháng 3
        </h4>
        <div className="flex items-center gap-3 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-blue-500 p-2 text-lg font-bold text-white">
            W
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-gray-800">hehe.docx</p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>624 KB</span>
              <Clock className="ml-1 h-3 w-3 text-blue-500" />
              <span className="text-blue-500">Tải về để xem lâu dài</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#42a5f5] p-2 text-[10px] font-bold text-white">
            MPP
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-gray-800">project.mpp</p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>242.5 KB</span>
              <Clock className="ml-1 h-3 w-3 text-blue-500" />
              <span className="text-blue-500">Tải về để xem lâu dài</span>
            </div>
          </div>
        </div>
      </div>

      {/* Group Ngày 30 Tháng 1 */}
      <div className="mt-2 border-t border-gray-100 px-3 pt-2 pb-6">
        <h4 className="mb-2 text-sm font-medium text-gray-800">
          Ngày 30 Tháng 1
        </h4>
        <div className="flex items-center gap-3 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-blue-500 p-2 text-lg font-bold text-white">
            W
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-gray-800">cau23_2425.docx</p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>16.33 KB</span>
              <CheckCircle2 className="ml-1 h-3 w-3 text-green-600" />
              <span className="text-green-600">Đã có trên máy</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-green-500 p-2 text-lg font-bold text-white">
            X
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-gray-800">Book1.xlsx</p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>12.78 KB</span>
              <AlertCircle className="ml-1 h-3 w-3 text-gray-400" />
              <span className="text-gray-500">File không tồn tại</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-red-500 p-2 text-[10px] font-bold text-white">
            PDF
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-gray-800">
              itpm06-140329000723-phpapp02.pdf
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>4.23 MB</span>
              <AlertCircle className="ml-1 h-3 w-3 text-gray-400" />
              <span className="text-gray-500">File không tồn tại</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
