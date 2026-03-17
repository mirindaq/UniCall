import {
  ChevronDown,
  Link as LinkIcon,
  MoreHorizontal,
  Search,
  Share,
} from "lucide-react"

export default function StorageLinks() {
  return (
    <div className="flex flex-col">
      {/* Filter */}
      <div className="p-3 pb-2">
        <div className="relative mb-3 flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm link"
            className="w-full rounded-full border border-gray-300 bg-white py-1.5 pr-4 pl-9 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex flex-1 items-center justify-between rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
            Người gửi <ChevronDown className="h-4 w-4" />
          </button>
          <button className="flex flex-1 items-center justify-between rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
            Ngày gửi <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Group Ngày 14 Tháng 3 */}
      <div className="mt-2 px-3">
        <h4 className="mb-2 text-sm font-medium text-gray-800">
          Ngày 14 Tháng 3
        </h4>
        <div className="group flex items-center gap-3 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gray-100">
            <LinkIcon className="h-5 w-5 text-gray-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-gray-800">
              https://vt.tiktok.com/ZSuPFP46c/
            </p>
            <p className="text-xs text-blue-500">vt.tiktok.com</p>
          </div>
        </div>
      </div>

      {/* Group Ngày 13 Tháng 3 */}
      <div className="mt-2 border-t border-gray-100 px-3 pt-2">
        <h4 className="mb-2 text-sm font-medium text-gray-800">
          Ngày 13 Tháng 3
        </h4>
        <div className="group flex items-center gap-3 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gray-100">
            <div
              className="h-5 w-5 bg-gradient-to-tr from-green-500 via-yellow-400 to-blue-500"
              style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
            ></div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-gray-800">
              https://drive.google.com/drive/f...
            </p>
            <p className="text-xs text-blue-500">drive.google.com</p>
          </div>
          <div className="flex items-center gap-1 rounded border border-gray-100 bg-white px-1 opacity-0 shadow-sm transition group-hover:opacity-100">
            <button className="rounded p-1 hover:bg-gray-100">
              <Share className="h-4 w-4 text-gray-500" />
            </button>
            <button className="rounded p-1 hover:bg-gray-100">
              <MoreHorizontal className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="group flex items-center gap-3 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gray-100">
            <LinkIcon className="h-5 w-5 text-gray-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-gray-800">
              GitHub - 2112pk1z/Unicall/Backend: back...
            </p>
            <p className="text-xs text-blue-500">github.com</p>
          </div>
        </div>
      </div>

      {/* Group Ngày 09 Tháng 3 */}
      <div className="mt-2 border-t border-gray-100 px-3 pt-2 pb-6">
        <h4 className="mb-2 text-sm font-medium text-gray-800">
          Ngày 09 Tháng 3
        </h4>
        <div className="group flex items-center gap-3 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gray-100">
            <LinkIcon className="h-5 w-5 text-gray-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-gray-800">Outlook</p>
            <p className="text-xs text-blue-500">outlook.office.com</p>
          </div>
        </div>
      </div>
    </div>
  )
}
