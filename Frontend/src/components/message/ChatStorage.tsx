import { ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
    <div className="flex h-full w-full max-w-[340px] shrink-0 flex-col border-l bg-background">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-4">
        <Button onClick={onBack} variant="ghost" size="icon">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-base font-semibold text-foreground">Kho lưu trữ</h2>
        <Button variant="ghost" className="text-primary">
          Chọn
        </Button>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as "images" | "files" | "links")
        }
        className="flex min-h-0 w-full min-w-0 flex-1 flex-col"
      >
        <TabsList
          variant="line"
          className="h-auto w-full rounded-none border-b bg-transparent p-0"
        >
          <TabsTrigger value="images" className="rounded-none py-3">
            Ảnh/Video
          </TabsTrigger>
          <TabsTrigger value="files" className="rounded-none py-3">
            Files
          </TabsTrigger>
          <TabsTrigger value="links" className="rounded-none py-3">
            Links
          </TabsTrigger>
        </TabsList>

        <div className="custom-scrollbar min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <TabsContent value="images" className="m-0 w-full min-w-0">
            <StorageImages />
          </TabsContent>
          <TabsContent value="files" className="m-0 w-full min-w-0">
            <StorageFiles />
          </TabsContent>
          <TabsContent value="links" className="m-0 w-full min-w-0">
            <StorageLinks />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
