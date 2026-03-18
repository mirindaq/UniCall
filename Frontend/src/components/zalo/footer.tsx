const footerLinks = {
  solutions: {
    title: "Giải pháp",
    links: [
      { label: "Zalo AI", href: "#" },
      { label: "Giải pháp doanh nghiệp", href: "#" },
      { label: "Chuyển đổi số", href: "#" },
      { label: "AdMicro", href: "#" },
    ],
  },
  support: {
    title: "Hỗ trợ & Liên hệ",
    links: [
      { label: "Hỗ trợ người dùng", href: "#" },
      { label: "Hỗ trợ nhà phát triển", href: "#" },
      { label: "Bảo mật", href: "#" },
      { label: "Báo cáo vi phạm", href: "#" },
      { label: "Liên hệ", href: "#" },
    ],
  },
  company: {
    title: "Zalo",
    links: [
      { label: "Tuyển dụng", href: "#" },
      { label: "Tải xuống", href: "#" },
      { label: "Zalo PC", href: "#" },
      { label: "Zalo Web", href: "#" },
    ],
  },
};

export function Footer() {
  return (
    <footer className="bg-background border-border" id="about">
      <div className="bg-[#f6f7f9] max-w-6xl mx-auto px-6 md:px-12 py-16 lg:py-20">
        
        {/* Khối Logo & Địa chỉ */}
        <div className="mb-16">
          <a href="/" className="inline-block">
            <span className="text-4xl font-bold text-[#0068ff]">Zalo</span>
          </a>
          <p className="mt-4 text-[15px] text-black leading-relaxed font-medium">
            VNG Campus, Phường Tân Thuận, TP.HCM
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-12 lg:gap-8">
          
          {/* Solutions */}
          <div className="min-w-[150px]">
            <h3 className="font-bold text-black mb-7 text-[20px] tracking-wide">
              {footerLinks.solutions.title}
            </h3>
            <ul className="space-y-5">
              {footerLinks.solutions.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-[15px] font-medium text-black hover:underline transition-all"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="min-w-[200px]">
            <h3 className="font-bold text-black mb-7 text-[20px] tracking-wide">
              {footerLinks.support.title}
            </h3>
            <ul className="space-y-5">
              {footerLinks.support.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-[15px] font-medium text-black hover:underline transition-all"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột cuối: Zalo trên, Tải xuống dưới */}
          <div className="flex flex-col gap-12 min-w-[150px]">
             <div>
                <h3 className="font-bold text-black mb-6 text-[20px] tracking-wide">Zalo</h3>
                <a href="#" className="text-[15px] font-medium text-black hover:underline">Tuyển dụng</a>
             </div>
             <div>
                <h3 className="font-bold text-black mb-5 text-[20px] tracking-wide">Tải xuống</h3>
                <ul className="space-y-5 text-black text-[15px] font-medium">
                  <li><a href="#" className="hover:text-[#0068ff] transition-colors">Zalo PC</a></li>
                  <li><a href="#" className="hover:text-[#0068ff] transition-colors">Zalo Web</a></li>
                </ul>
             </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-24 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground font-medium">
              2024 Zalo. All rights reserved.
            </p>
            <div className="flex items-center gap-8">
              <a href="#" className="text-sm text-muted-foreground hover:text-black hover:underline transition-colors">
                Điều khoản sử dụng
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-black hover:underline transition-colors">
                Chính sách bảo mật
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}