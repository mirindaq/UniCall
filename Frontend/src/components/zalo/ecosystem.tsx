import { MessageCircle, Music, Newspaper, Car, Play } from "lucide-react"

const products = [
  {
    name: "Zalo",
    description: "Ứng dụng liên lạc số 1 Việt Nam",
    icon: MessageCircle,
    color: "bg-[#0068ff]",
  },
  {
    name: "Zing MP3",
    description: "Nền tảng nghe nhạc trực tuyến hàng đầu",
    icon: Music,
    color: "bg-gradient-to-br from-purple-500 to-pink-500",
  },
  {
    name: "Bao Moi",
    description: "Nền tảng tin tức hàng đầu",
    icon: Newspaper,
    color: "bg-orange-500",
  },
  {
    name: "Kiki Auto",
    description: "Trợ lý ảo AI phổ biến nhất",
    icon: Car,
    color: "bg-[#00c853]",
  },
  {
    name: "Zalo Video",
    description: "Trải nghiệm xem video ngắn",
    icon: Play,
    color: "bg-red-500",
  },
]

export function Ecosystem() {
  return (
    <section className="py-20 bg-background" id="ai">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight text-balance">
              Khám phá hệ sinh thái kết nối, giải trí và tiện ích cho cuộc sống
            </h2>
          </div>

          {/* Right - Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {products.map((product) => (
              <div
                key={product.name}
                className="bg-white rounded-xl border border-border p-4 hover:shadow-md transition-shadow duration-300 cursor-pointer group"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${product.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}
                >
                  <product.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{product.name}</h3>
                <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                  {product.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
