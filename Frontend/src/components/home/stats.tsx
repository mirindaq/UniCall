const stats = [
  {
    product: "Zalo",
    description: "Ứng dụng liên lạc số 1 Việt Nam",
    stats: [
      { value: "2B+", label: "tin nhắn mỗi ngày" },
      { value: "79M+", label: "người dùng" },
    ],
    image: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&h=500&fit=crop",
    color: "text-[#0068ff]",
  },
  {
    product: "Kiki Auto",
    description: "Trợ lý AI phổ biến nhất trên xe hơi",
    stats: [{ value: "1M+", label: "đã cài đặt" }],
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=500&fit=crop",
    color: "text-[#00c853]",
    logo: "Kiki",
  },
  {
    product: "Zalo Video",
    description: "Xem video giải trí",
    stats: [{ value: "40M+", label: "người dùng" }],
    image: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&h=500&fit=crop",
    color: "text-[#ff6b35]",
  },
]

export function Stats() {
  return (
    <section className="py-20 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground text-balance">
            Từ thói quen đến niềm tin
          </h2>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg text-pretty">
            Đó là cách hàng chục triệu người dùng tin cậy sử dụng thường xuyên các sản phẩm của Zalo để kết nối, giúp cuộc sống tiện lợi và cho nhiều mục đích khác.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Zalo Card */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden lg:row-span-2">
            <div className="aspect-video overflow-hidden">
              <img
                src={stats[0].image}
                alt={stats[0].product}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#0068ff] flex items-center justify-center">
                  <span className="text-white font-bold">Z</span>
                </div>
                <div>
                  <h3 className="font-bold text-xl text-foreground">{stats[0].product}</h3>
                  <p className="text-muted-foreground text-sm">{stats[0].description}</p>
                </div>
              </div>
              <div className="flex gap-8 mt-6">
                {stats[0].stats.map((stat) => (
                  <div key={stat.label}>
                    <div className={`text-4xl lg:text-5xl font-bold ${stats[0].color}`}>
                      {stat.value}
                    </div>
                    <div className="text-muted-foreground text-sm mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Kiki Auto Card */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden flex flex-col sm:flex-row">
            <div className="sm:w-1/2 aspect-video sm:aspect-auto overflow-hidden">
              <img
                src={stats[1].image}
                alt={stats[1].product}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="sm:w-1/2 p-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="px-3 py-1 rounded-lg bg-green-100 text-[#00c853] font-bold text-sm">
                  Kiki
                </div>
              </div>
              <h3 className="font-bold text-lg text-foreground">{stats[1].product}</h3>
              <p className="text-muted-foreground text-sm">{stats[1].description}</p>
              <div className="mt-4">
                <div className={`text-3xl lg:text-4xl font-bold ${stats[1].color}`}>
                  {stats[1].stats[0].value}
                </div>
                <div className="text-muted-foreground text-sm mt-1">
                  {stats[1].stats[0].label}
                </div>
              </div>
            </div>
          </div>

          {/* Zalo Video Card */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden flex flex-col sm:flex-row">
            <div className="sm:w-1/2 aspect-video sm:aspect-auto overflow-hidden">
              <img
                src={stats[2].image}
                alt={stats[2].product}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="sm:w-1/2 p-6">
              <h3 className="font-bold text-lg text-foreground">{stats[2].product}</h3>
              <p className="text-muted-foreground text-sm">{stats[2].description}</p>
              <div className="mt-4">
                <div className={`text-3xl lg:text-4xl font-bold ${stats[2].color}`}>
                  {stats[2].stats[0].value}
                </div>
                <div className="text-muted-foreground text-sm mt-1">
                  {stats[2].stats[0].label}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}