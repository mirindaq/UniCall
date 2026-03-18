import { ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
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
    <div className="flex h-full w-[340px] shrink-0 flex-col border-l bg-background">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-4">
        <Button onClick={onBack} variant="ghost" size="icon">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-base font-semibold text-foreground">
          Kho lÆ°u trá»¯
        </h2>
        <Button variant="ghost" className="text-primary">
          Chá»n
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as "images" | "files" | "links")
        }
        className="h-full"
      >
        <TabsList
          variant="line"
          className="h-auto w-full rounded-none border-b bg-transparent p-0"
        >
          <TabsTrigger value="images" className="rounded-none py-3">
            áº¢nh/Video
          </TabsTrigger>
          <TabsTrigger value="files" className="rounded-none py-3">
            Files
          </TabsTrigger>
          <TabsTrigger value="links" className="rounded-none py-3">
            Links
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100%-49px)]">
          <TabsContent value="images">
            <StorageImages />
          </TabsContent>
          <TabsContent value="files">
            <StorageFiles />
          </TabsContent>
          <TabsContent value="links">
            <StorageLinks />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
