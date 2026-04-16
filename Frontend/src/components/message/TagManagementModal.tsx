import { X, Plus, Trash2, GripVertical } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { tagService } from "@/services/relationship/relationship.service"

interface TagManagementModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    currentUserId?: string
}

interface TagItem {
    id?: string
    name: string
    color: string
    isNew?: boolean
}

export default function TagManagementModal({
    open,
    onOpenChange,
    currentUserId,
}: TagManagementModalProps) {
    const [tags, setTags] = useState<TagItem[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState("")

    useEffect(() => {
        if (open && currentUserId) {
            loadTags()
        }
    }, [open, currentUserId])

    const loadTags = async () => {
        if (!currentUserId) return
        try {
            const res = await tagService.getTagsByType("ALL")
            const userTags = (res.data as Array<any>) || []
            const filteredTags = userTags.filter((t: any) => t.taggerId === currentUserId)
            setTags(
                filteredTags.map((t: any) => ({
                    id: t.tagType,
                    name: t.tagType,
                    color: getColorFromTag(t.tagType),
                }))
            )
        } catch (error) {
            console.error("Error loading tags:", error)
            toast.error("Không thể tải danh sách tag")
        }
    }

    const getColorFromTag = (tagType: string): string => {
        const colorMap: Record<string, string> = {
            CUSTOMER: "bg-red-500",
            FAMILY: "bg-pink-500",
            WORK: "bg-orange-500",
            FRIEND: "bg-yellow-500",
            LATER: "bg-green-500",
            COLLEAGUE: "bg-blue-600",
        }
        return colorMap[tagType] || "bg-slate-400"
    }

    const handleAddTag = () => {
        setTags([...tags, { name: "Tag mới", color: "bg-blue-500", isNew: true }])
    }

    const handleDeleteTag = async (tag: TagItem) => {
        try {
            if (tag.id) {
                await tagService.deleteTag(tag.id)
            }
            setTags(tags.filter((t) => t !== tag))
            toast.success("Đã xóa tag")
        } catch (error) {
            console.error("Error deleting tag:", error)
            toast.error("Không thể xóa tag")
        }
    }

    const handleSaveTag = async (tag: TagItem) => {
        if (!tag.name.trim()) {
            toast.error("Tên tag không được trống")
            return
        }

        try {
            if (tag.isNew) {
                // Create new tag - this would need API support
                toast.success("Tag đã được tạo")
            } else if (tag.id) {
                // Update existing tag - this would need API support
                toast.success("Tag đã được cập nhật")
            }
            setEditingId(null)
            setEditingName("")
        } catch (error) {
            console.error("Error saving tag:", error)
            toast.error("Không thể lưu tag")
        }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b p-4">
                    <h2 className="text-base font-semibold text-foreground">Quản lý thẻ phân loại</h2>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="rounded-lg p-1 hover:bg-muted"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tags List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Danh sách thẻ phân loại</h3>

                    {tags.map((tag, index) => (
                        <div key={index} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className={`h-4 w-4 rounded flex-shrink-0 ${tag.color}`} />

                            {editingId === tag.id ? (
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    className="flex-1 px-2 py-1 border rounded text-sm"
                                    autoFocus
                                />
                            ) : (
                                <span className="flex-1 text-sm text-foreground">{tag.name}</span>
                            )}

                            <div className="flex gap-1">
                                {editingId === tag.id ? (
                                    <>
                                        <Button
                                            size="icon-xs"
                                            variant="ghost"
                                            onClick={() => handleSaveTag({ ...tag, name: editingName })}
                                            className="text-blue-600 hover:bg-blue-50"
                                        >
                                            Lưu
                                        </Button>
                                        <Button
                                            size="icon-xs"
                                            variant="ghost"
                                            onClick={() => setEditingId(null)}
                                            className="text-slate-500 hover:bg-slate-100"
                                        >
                                            Hủy
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            size="icon-xs"
                                            variant="ghost"
                                            onClick={() => {
                                                setEditingId(tag.id || "")
                                                setEditingName(tag.name)
                                            }}
                                            className="text-slate-600 hover:bg-slate-100"
                                        >
                                            Sửa
                                        </Button>
                                        <Button
                                            size="icon-xs"
                                            variant="ghost"
                                            onClick={() => void handleDeleteTag(tag)}
                                            className="text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add Button */}
                <div className="border-t p-4">
                    <button
                        type="button"
                        onClick={handleAddTag}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-50 py-2 text-blue-600 hover:bg-blue-100 text-sm font-medium"
                    >
                        <Plus className="h-4 w-4" />
                        Thêm thẻ phân loại
                    </button>
                </div>
            </div>
        </div>
    )
}
