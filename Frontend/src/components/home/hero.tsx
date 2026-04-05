import { Languages, Bot } from "lucide-react"

export function Hero() {
  return (
    <section className="pt-24 pb-16 bg-gradient-to-b from-blue-50/50 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight text-balance">
            Phát triển <span className="text-[#0068ff]">Internet</span>,
            <br />
            thay đổi <span className="text-[#00c853]">cuộc sống</span> người Việt Nam
          </h1>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto text-pretty">
            Từ ứng dụng nhắn tin phổ biến nhất Việt Nam đến công nghệ AI tiên tiến, những sản phẩm của Zalo đang hỗ trợ cuộc sống hằng ngày của hàng chục triệu người.
          </p>
        </div>

        {/* Chat Preview */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-border overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              {/* Left Side - AI Translation */}
              <div className="flex-1 p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-border">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#0068ff] flex items-center justify-center">
                    <Languages className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Tính năng AI</div>
                    <div className="font-semibold text-foreground">Dịch tin nhắn</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-[#0068ff] flex items-center justify-center text-white font-bold text-xs">
                        Z
                      </div>
                      <span className="font-medium text-foreground">Zalo</span>
                    </div>
                    <p className="text-foreground font-medium">Dịch tin nhắn</p>
                    <p className="text-[#0068ff] text-lg font-semibold mt-1">song ngữ Anh-Việt</p>
                  </div>
                  
                  {/* Flag Icons */}
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-8 h-6 rounded overflow-hidden border border-border">
                      <div className="h-full bg-gradient-to-b from-blue-900 via-white to-red-600" />
                    </div>
                    <div className="w-8 h-6 rounded overflow-hidden border border-border">
                      <div className="h-1/3 bg-blue-900" />
                      <div className="h-1/3 bg-white" />
                      <div className="h-1/3 bg-red-600" />
                    </div>
                    <div className="w-8 h-6 rounded overflow-hidden border border-border bg-red-600 flex items-center justify-center">
                      <div className="w-4 h-4 text-yellow-400">★</div>
                    </div>
                    <div className="w-8 h-6 rounded overflow-hidden border border-border">
                      <div className="h-full bg-gradient-to-b from-blue-800 via-white to-red-700" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Chat */}
              <div className="flex-1 p-6 lg:p-8 bg-gray-50/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#0068ff] flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-semibold text-foreground">Bạn thử các tính năng AI trên Zalo chưa?</span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-end">
                    <div className="bg-[#d5e8ff] rounded-2xl rounded-tr-md px-4 py-2 max-w-[80%]">
                      <p className="text-foreground text-sm">Mình muốn dịch tin nhắn tiếng Anh</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-white border border-border rounded-2xl rounded-tl-md px-4 py-2 max-w-[80%]">
                      <p className="text-foreground text-sm">Bạn có thể nhấn giữ tin nhắn và chọn "Dịch" để dịch nhanh sang tiếng Việt!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}