import { ChevronDown } from "lucide-react"

export default function StorageImages() {
  return (
    <div className="flex flex-col">
      {/* Filter */}
      <div className="flex gap-2 p-3 pb-0">
        <button className="flex flex-1 items-center justify-between rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
          Người gửi <ChevronDown className="h-4 w-4" />
        </button>
        <button className="flex flex-1 items-center justify-between rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
          Ngày gửi <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Group Ngày 14 Tháng 3 */}
      <div className="mt-4 px-3">
        <h4 className="mb-2 text-sm font-medium text-gray-800">
          Ngày 14 Tháng 3
        </h4>
        <div className="grid grid-cols-3 gap-1">
          <img
            src="https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=150&h=150&fit=crop"
            alt="img"
            className="aspect-square w-full rounded object-cover"
          />
        </div>
      </div>

      {/* Group Ngày 13 Tháng 3 */}
      <div className="mt-4 border-t border-gray-100 px-3 pt-4">
        <h4 className="mb-2 text-sm font-medium text-gray-800">
          Ngày 13 Tháng 3
        </h4>
        <div className="grid grid-cols-3 gap-1">
          <div className="flex aspect-square w-full items-center justify-center rounded border border-gray-200 bg-gray-50">
            <div className="h-6 w-10 bg-blue-200"></div>
          </div>
        </div>
      </div>

      {/* Group Ngày 11 Tháng 3 */}
      <div className="mt-4 border-t border-gray-100 px-3 pt-4">
        <h4 className="mb-2 text-sm font-medium text-gray-800">
          Ngày 11 Tháng 3
        </h4>
        <div className="grid grid-cols-3 gap-1">
          <img
            src="https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?w=150&h=150&fit=crop"
            alt="img"
            className="aspect-square w-full rounded object-cover"
          />
          <img
            src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=150&h=150&fit=crop"
            alt="img"
            className="aspect-square w-full rounded object-cover"
          />
        </div>
      </div>

      {/* Group Ngày 30 Tháng 1 */}
      <div className="mt-4 border-t border-gray-100 px-3 pt-4 pb-6">
        <h4 className="mb-2 text-sm font-medium text-gray-800">
          Ngày 30 Tháng 1
        </h4>
        <div className="grid grid-cols-3 gap-1">
          <img
            src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=150&h=150&fit=crop"
            alt="img"
            className="aspect-square w-full rounded object-cover"
          />
          <img
            src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=150&h=150&fit=crop"
            alt="img"
            className="aspect-square w-full rounded object-cover"
          />
          <img
            src="https://images.unsplash.com/photo-1586282391129-76a6df230234?w=150&h=150&fit=crop"
            alt="img"
            className="aspect-square w-full rounded object-cover"
          />
        </div>
      </div>
    </div>
  )
}
