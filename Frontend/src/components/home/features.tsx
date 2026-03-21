import { Smartphone, Cpu, Heart } from "lucide-react"

const features = [
  {
    icon: Smartphone,
    title: "Sản phẩm và dịch vụ",
    description: "Nhắn tin liên lạc, âm nhạc, tin tức, trợ lý AI - những sản phẩm của chúng tôi đã trở thành một phần trong những thói quen hằng ngày.",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=400&fit=crop",
  },
  {
    icon: Cpu,
    title: "AI và Công nghệ",
    description: "AI của chúng tôi có khả năng hiểu tiếng nói ngôn ngữ, nhận diện khuôn mặt, giúp tăng hiệu suất, và nhiều ứng dụng AI cho người dùng Việt Nam.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop",
  },
  {
    icon: Heart,
    title: "Ảnh hưởng và trách nhiệm",
    description: "Chúng tôi đầu tư vào chuyển đổi số, quyên góp từ việc tốt về AI và Việt Nam như thêm Zalo, công nghệ để phục vụ con người phải được làm như vậy.",
    image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&h=400&fit=crop",
  },
]

export function Features() {
  return (
    <section className="py-20 bg-background" id="products">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground text-balance">
            Nỗ lực và dấu ấn của Zalo
          </h2>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg text-pretty">
            Tìm hiểu cách Zalo xây dựng sản phẩm, phát triển công nghệ và đóng góp cho xã hội.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group bg-white rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              {/* Image */}
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              
              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-[#0068ff]" />
                  </div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
