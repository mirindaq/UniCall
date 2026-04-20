import { useState, useEffect, useRef } from "react"
import { Loader2, Image, Video, Globe, Lock, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { postService } from "@/services/post/post.service"
import type { PostResponse, PostPrivacy } from "@/types/post.type"

interface EditPostDialogProps {
    post: PostResponse | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function EditPostDialog({
    post,
    open,
    onOpenChange,
    onSuccess,
}: EditPostDialogProps) {
    const [content, setContent] = useState("")
    const [privacy, setPrivacy] = useState<PostPrivacy>("PUBLIC")
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [previewUrls, setPreviewUrls] = useState<Array<{ url: string; type: string; isNew?: boolean }>>([])
    const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Initialize form when dialog opens
    useEffect(() => {
        if (open && post) {
            setContent(post.content || "")
            setPrivacy(post.privacy || "PUBLIC")
            setSelectedFiles([])
            setPreviewUrls([])
            setExistingMediaUrls(post.mediaUrls || [])
        }
    }, [open, post])

    // Cleanup preview URLs on unmount
    useEffect(() => {
        return () => {
            previewUrls.forEach(preview => {
                if (preview.isNew) {
                    URL.revokeObjectURL(preview.url)
                }
            })
        }
    }, [])

    const isVideo = (url: string) => {
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']
        return videoExtensions.some(ext => url.toLowerCase().includes(ext))
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        const validFiles = files.filter(file =>
            file.type.startsWith("image/") || file.type.startsWith("video/")
        )

        if (validFiles.length !== files.length) {
            toast.error("Chỉ chấp nhận file ảnh và video")
        }

        setSelectedFiles(prev => [...prev, ...validFiles])

        // Create preview URLs with type info
        const newPreviews = validFiles.map(file => ({
            url: URL.createObjectURL(file),
            type: file.type,
            isNew: true,
        }))
        setPreviewUrls(prev => [...prev, ...newPreviews])
    }

    const handleRemoveFile = (index: number) => {
        const preview = previewUrls[index]
        if (preview?.isNew) {
            setSelectedFiles(prev => prev.filter((_, i) => i !== index))
            URL.revokeObjectURL(preview.url)
        }
        setPreviewUrls(prev => prev.filter((_, i) => i !== index))
    }

    const handleRemoveExistingMedia = (index: number) => {
        setExistingMediaUrls(prev => prev.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        if (!content.trim() && selectedFiles.length === 0 && existingMediaUrls.length === 0) {
            toast.error("Vui lòng nhập nội dung hoặc chọn ảnh/video")
            return
        }

        if (!post) return

        setIsLoading(true)
        try {
            // If there are new files, we need to use multipart form data
            if (selectedFiles.length > 0) {
                const formData = new FormData()
                formData.append("content", content.trim() || " ")
                formData.append("privacy", privacy)

                selectedFiles.forEach(file => {
                    formData.append("files", file)
                })

                // Include existing media URLs if any
                if (existingMediaUrls.length > 0) {
                    existingMediaUrls.forEach((url, index) => {
                        formData.append(`existingMediaUrls[${index}]`, url)
                    })
                }

                await postService.updatePost(post.id, formData as any)
            } else {
                // If only updating content and privacy without new files
                await postService.updatePost(post.id, {
                    content: content.trim() || " ",
                    privacy,
                    mediaUrls: existingMediaUrls,
                })
            }

            toast.success("Đã cập nhật bài viết")
            onOpenChange(false)
            onSuccess()
        } catch (error) {
            console.error("Error updating post:", error)
            toast.error("Không thể cập nhật bài viết")
        } finally {
            setIsLoading(false)
        }
    }

    const renderMedia = (url: string, index: number) => {
        if (isVideo(url)) {
            return (
                <video
                    key={index}
                    src={url}
                    className="w-full h-32 object-cover rounded-lg"
                    controls
                />
            )
        }
        return (
            <img
                key={index}
                src={url}
                alt={`Media ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
            />
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Chỉnh sửa bài viết</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Content Textarea */}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Nội dung</label>
                        <Textarea
                            placeholder="Hôm nay bạn thế nào?"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="min-h-24 resize-none mt-2"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Existing Media Display */}
                    {existingMediaUrls.length > 0 && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Ảnh/Video hiện tại ({existingMediaUrls.length})
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {existingMediaUrls.map((url, index) => (
                                    <div key={index} className="relative group">
                                        {renderMedia(url, index)}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveExistingMedia(index)}
                                            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            disabled={isLoading}
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* New File Previews */}
                    {previewUrls.length > 0 && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Ảnh/Video mới ({previewUrls.length})
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {previewUrls.map((preview, index) => (
                                    <div key={index} className="relative group">
                                        {preview.type.startsWith("video/") ? (
                                            <video
                                                src={preview.url}
                                                className="w-full h-32 object-cover rounded-lg"
                                                controls
                                            />
                                        ) : (
                                            <img
                                                src={preview.url}
                                                alt={`Preview ${index + 1}`}
                                                className="w-full h-32 object-cover rounded-lg"
                                            />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(index)}
                                            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            disabled={isLoading}
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <Separator />

                    {/* Privacy & File Controls */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex gap-2 items-center flex-wrap">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                                onChange={handleFileSelect}
                                disabled={isLoading}
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading}
                            >
                                <Image className="mr-2 size-4" />
                                Ảnh
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading}
                            >
                                <Video className="mr-2 size-4" />
                                Video
                            </Button>
                            <Select value={privacy} onValueChange={(value) => setPrivacy(value as PostPrivacy)} disabled={isLoading}>
                                <SelectTrigger className="w-35 h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PUBLIC">
                                        <div className="flex items-center gap-2">
                                            <Globe className="size-3" />
                                            <span>Bạn bè</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="PRIVATE">
                                        <div className="flex items-center gap-2">
                                            <Lock className="size-3" />
                                            <span>Chỉ mình tôi</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={(!content.trim() && selectedFiles.length === 0 && existingMediaUrls.length === 0) || isLoading}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isLoading ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : null}
                        Cập nhật
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
