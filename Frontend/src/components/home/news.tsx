const news = [
  {
    title: "Bản đồ cứu hộ khẩn cấp trên Zalo SOS",
    description: "Tính năng mới giúp người dùng gửi vị trí khẩn cấp và nhận hỗ trợ nhanh chóng trong các tình huống nguy hiểm.",
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=500&fit=crop",
    category: "Tính năng mới",
  },
  {
    title: "Zalo và hành trình làm chủ LLM tiếng Việt",
    description: "Câu chuyện về việc phát triển mô hình ngôn ngữ lớn đầu tiên dành riêng cho người Việt.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=500&fit=crop",
    category: "AI & Công nghệ",
    badge: "ZaloAI",
  },
  {
    title: "Ứng dụng mới trên Zalo: Để mỗi công dân Việt đều có trợ lý ảo",
    description: "Zalo ra mắt tính năng trợ lý AI mới, giúp người dùng thực hiện các tác vụ hằng ngày một cách dễ dàng.",
    image: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800&h=500&fit=crop",
    category: "Sản phẩm",
  },
]

export function News() {
  return (
    <section className="py-20 bg-gray-50/50" id="impact">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground text-balance">
            Những cập nhật nổi bật
          </h2>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg text-pretty">
            Từ nhu cầu bản địa đến làn sóng công nghệ toàn cầu, Zalo không ngừng nâng cấp để luôn hữu ích, tin cậy và duy trì vị thế dẫn đầu.
          </p>
        </div>

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((item, index) => (
            <article
              key={index}
              className="group bg-white rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              {/* Image */}
              <div className="aspect-video overflow-hidden relative">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {item.badge && (
                  <div className="absolute top-3 right-3 px-3 py-1 bg-[#0068ff] text-white text-xs font-semibold rounded-full">
                    {item.badge}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="text-xs font-medium text-[#0068ff] mb-2">
                  {item.category}
                </div>
                <h3 className="font-semibold text-foreground text-lg leading-snug mb-2 group-hover:text-[#0068ff] transition-colors line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}