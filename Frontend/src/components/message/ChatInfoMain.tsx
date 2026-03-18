import {
  AlertTriangle,
  BellOff,
  Clock,
  Edit2,
  EyeOff,
  HelpCircle,
  Link as LinkIcon,
  Pin,
  Trash2,
  Users,
} from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  messageInfoPreviewFiles,
  messageInfoPreviewLinks,
} from "@/mock/message-data"

interface ChatInfoMainProps {
  openStorage: (tab: "images" | "files" | "links") => void
}

export default function ChatInfoMain({ openStorage }: ChatInfoMainProps) {
  return (
    <div className="flex h-full w-[340px] shrink-0 flex-col border-l bg-background">
      <div className="flex shrink-0 items-center justify-center border-b px-4 py-5">
        <h2 className="text-base font-semibold text-foreground">
          ThÃƒÂ´ng tin hÃ¡Â»â„¢i thoÃ¡ÂºÂ¡i
        </h2>
      </div>

      <ScrollArea className="h-full">
        <div className="flex flex-col">
          <div className="flex flex-col items-center border-b p-4">
            <Avatar className="mb-2 h-16 w-16">
              <AvatarImage
                src="https://avatarngau.sbs/wp-content/uploads/2025/05/avatar-phong-canh-17.jpg"
                alt="Avatar"
              />
              <AvatarFallback>NH</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-medium">
                NguyÃ¡Â»â€¦n Ã„ÂÃ¡Â»Â©c HÃƒÂ¹ng
              </h4>
              <Button
                variant="secondary"
                size="icon-xs"
                title="SÃ¡Â»Â­a biÃ¡Â»â€¡t danh"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="mt-4 flex w-full justify-center gap-5">
              <div className="flex cursor-pointer flex-col items-center gap-1">
                <Button variant="secondary" size="icon">
                  <BellOff className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  TÃ¡ÂºÂ¯t thÃƒÂ´ng bÃƒÂ¡o
                </span>
              </div>
              <div className="flex cursor-pointer flex-col items-center gap-1">
                <Button variant="secondary" size="icon">
                  <Pin className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  Ghim hÃ¡Â»â„¢i thoÃ¡ÂºÂ¡i
                </span>
              </div>
              <div className="flex cursor-pointer flex-col items-center gap-1">
                <Button variant="secondary" size="icon">
                  <Users className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  TÃ¡ÂºÂ¡o nhÃƒÂ³m
                </span>
              </div>
            </div>
          </div>

          <Accordion
            type="multiple"
            defaultValue={["images", "files", "links", "security"]}
            className="px-4"
          >
            <AccordionItem value="images">
              <AccordionTrigger className="py-3 font-semibold">
                Ã¡ÂºÂ¢nh/Video
              </AccordionTrigger>
              <AccordionContent>
                <div className="mb-3 grid grid-cols-3 gap-1">
                  <img
                    src="https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=150&h=150&fit=crop"
                    alt="HÃƒÂ¬nh 1"
                    className="aspect-square w-full rounded object-cover"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=150&h=150&fit=crop"
                    alt="HÃƒÂ¬nh 2"
                    className="aspect-square w-full rounded object-cover"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=150&h=150&fit=crop"
                    alt="HÃƒÂ¬nh 3"
                    className="aspect-square w-full rounded object-cover"
                  />
                </div>
                <Button
                  onClick={() => openStorage("images")}
                  variant="secondary"
                  className="w-full"
                >
                  Xem tÃ¡ÂºÂ¥t cÃ¡ÂºÂ£
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="files">
              <AccordionTrigger className="py-3 font-semibold">
                File
              </AccordionTrigger>
              <AccordionContent>
                <div className="mb-3 space-y-3">
                  {messageInfoPreviewFiles.map((file) => (
                    <div key={file.name} className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded p-2 text-[10px] font-bold text-white ${file.color}`}
                      >
                        {file.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>{file.size}</span>
                          <Clock className="h-3 w-3 text-blue-500" />
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {file.time}
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => openStorage("files")}
                  variant="secondary"
                  className="w-full"
                >
                  Xem tÃ¡ÂºÂ¥t cÃ¡ÂºÂ£
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="links">
              <AccordionTrigger className="py-3 font-semibold">
                Link
              </AccordionTrigger>
              <AccordionContent>
                <div className="mb-3 space-y-3">
                  {messageInfoPreviewLinks.map((link) => (
                    <div key={link.title} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        {link.icon === "link" ? (
                          <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <div className="h-4 w-4 rounded-sm bg-green-500"></div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">
                          {link.title}
                        </p>
                        <a
                          href="#"
                          className="block truncate text-xs text-primary hover:underline"
                        >
                          {link.sub}
                        </a>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {link.time}
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => openStorage("links")}
                  variant="secondary"
                  className="w-full"
                >
                  Xem tÃ¡ÂºÂ¥t cÃ¡ÂºÂ£
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="security">
              <AccordionTrigger className="py-3 font-semibold">
                ThiÃ¡ÂºÂ¿t lÃ¡ÂºÂ­p bÃ¡ÂºÂ£o mÃ¡ÂºÂ­t
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="flex cursor-pointer items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm text-foreground">
                          Tin nhÃ¡ÂºÂ¯n tÃ¡Â»Â± xÃƒÂ³a
                        </p>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        KhÃƒÂ´ng bao giÃ¡Â»Â
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                      <p className="text-sm text-foreground">
                        Ã¡ÂºÂ¨n trÃƒÂ² chuyÃ¡Â»â€¡n
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Separator />
          <div className="space-y-2 p-4">
            <Button variant="ghost" className="w-full justify-start">
              <AlertTriangle className="h-5 w-5" />
              BÃƒÂ¡o xÃ¡ÂºÂ¥u
            </Button>
            <Button variant="destructive" className="w-full justify-start">
              <Trash2 className="h-5 w-5" />
              XoÃƒÂ¡ lÃ¡Â»â€¹ch sÃ¡Â»Â­ trÃƒÂ² chuyÃ¡Â»â€¡n
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
