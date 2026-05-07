import { ChevronLeft, ChevronRight, RotateCcw, RotateCw, ZoomIn, ZoomOut } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type ImageViewerItem = {
  url: string
  alt?: string
}

interface ImageGalleryViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: ImageViewerItem[]
  initialIndex?: number
}

export default function ImageGalleryViewer({
  open,
  onOpenChange,
  images,
  initialIndex = 0,
}: ImageGalleryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const maxIndex = Math.max(images.length - 1, 0)

  const resetTransform = () => {
    setZoom(1)
    setRotation(0)
  }

  useEffect(() => {
    if (!open) {
      return
    }
    const boundedIndex = Math.min(Math.max(initialIndex, 0), maxIndex)
    setCurrentIndex(boundedIndex)
    setZoom(1)
    setRotation(0)
  }, [open, initialIndex, maxIndex])

  useEffect(() => {
    setZoom(1)
    setRotation(0)
  }, [currentIndex])

  useEffect(() => {
    if (!open) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setCurrentIndex((prev) => Math.max(prev - 1, 0))
      }
      if (event.key === "ArrowRight") {
        setCurrentIndex((prev) => Math.min(prev + 1, maxIndex))
      }
      if (event.key === "+" || event.key === "=") {
        setZoom((prev) => Math.min(prev + 0.25, 4))
      }
      if (event.key === "-") {
        setZoom((prev) => Math.max(prev - 0.25, 0.5))
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, maxIndex])

  const currentImage = useMemo(() => images[currentIndex], [images, currentIndex])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[90vh] w-[95vw] !min-w-[95vw] overflow-hidden border-0 bg-black/95 p-0" showCloseButton>
        <div className="flex h-full min-h-0">
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-6">
            {currentImage ? (
              <img
                src={currentImage.url}
                alt={currentImage.alt ?? "Image"}
                className="max-h-full max-w-full object-contain transition-transform duration-150"
                style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
              />
            ) : null}

            {currentIndex > 0 ? (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute left-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border-0 bg-black/60 text-white hover:bg-black/80"
                onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            ) : null}

            {currentIndex < maxIndex ? (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border-0 bg-black/60 text-white hover:bg-black/80"
                onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, maxIndex))}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            ) : null}

            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/55 px-2 py-1 backdrop-blur-sm">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full border-0 bg-white/10 text-white hover:bg-white/20"
                onClick={() => setZoom((prev) => Math.max(prev - 0.25, 0.5))}
                title="Thu nhỏ"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-xs text-white">{Math.round(zoom * 100)}%</span>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full border-0 bg-white/10 text-white hover:bg-white/20"
                onClick={() => setZoom((prev) => Math.min(prev + 0.25, 4))}
                title="Phóng to"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="mx-1 h-5 w-px bg-white/25" />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full border-0 bg-white/10 text-white hover:bg-white/20"
                onClick={() => setRotation((prev) => prev - 90)}
                title="Xoay trái 90°"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full border-0 bg-white/10 text-white hover:bg-white/20"
                onClick={() => setRotation((prev) => prev + 90)}
                title="Xoay phải 90°"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-8 rounded-full border-0 bg-white/10 px-3 text-xs text-white hover:bg-white/20"
                onClick={resetTransform}
                title="Đặt lại"
              >
                Reset
              </Button>
            </div>
          </div>

          <div className="hidden h-full w-24 shrink-0 border-l border-white/10 bg-black/60 p-2 md:block">
            <div className="custom-scrollbar h-full space-y-2 overflow-y-auto">
              {images.map((item, index) => (
                <button
                  key={`${item.url}-${index}`}
                  type="button"
                  className={cn(
                    "w-full overflow-hidden rounded-md border border-transparent bg-white/10 transition",
                    index === currentIndex && "border-blue-400 ring-1 ring-blue-500/70",
                  )}
                  onClick={() => setCurrentIndex(index)}
                >
                  <img src={item.url} alt={item.alt ?? "Thumbnail"} className="h-16 w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
