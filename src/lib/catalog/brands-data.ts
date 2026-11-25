// ==============================================================================
// YUKI WEB V4 — COMPLETE BRAND CATALOG & VARIANT PACKAGES
// Master Data V4 Approved with Safe Profit Pricing Adjustments (+14%)
// Strictly 100% Intact for: Spotify, Locket Gold, Muse AI, API Tool SMS & Buff MXH
// ==============================================================================

export interface PackageVariant {
  sku: string;
  name: string;
  price: number; // Stored as BIGINT VND
  originalPrice?: number;
  duration: string;
  durationDays: number | null; // null = Lifetime
  status: 'ACTIVE' | 'NEEDS_REVIEW' | 'ARCHIVED' | 'INACTIVE';
  fulfillmentMode: 'MANUAL' | 'AUTO';
  isTrial?: boolean;
  warranty: string;
  warrantyDays?: number;
  warranty_days?: number;
  description?: string;
  benefits: string[];
  usageConditions: string[];
  internalNotes?: string;
  stock: number;
  allow_voucher?: boolean;
  allowVoucher?: boolean;
  input_type?: string;
  delivery_mode?: string;
  custom_input_label?: string;
  fulfillment_mode?: string;
  requires_credentials?: boolean;
  sort_order?: number;
  category?: string;
  display_section?: string;
}

export interface BrandInfo {
  slug: string;
  name: string;
  category: string;
  badgeLabel: string;
  shortDesc: string;
  fullDesc: string;
  iconPath: string;
  gradient: string;
  brandColor: string;
  packages: PackageVariant[];
}

export const BRANDS_CATALOG: BrandInfo[] = [
  {
    "slug": "mb-bank",
    "name": "MB Bank",
    "category": "Tài Chính & Ngân Hàng",
    "badgeLabel": "Số Đẹp",
    "shortDesc": "Voucher mở/chọn tài khoản số đẹp MB Bank chính chủ.",
    "fullDesc": "Voucher mở/chọn tài khoản số đẹp MB Bank chính chủ. Nhập số điện thoại / thông tin cần hỗ trợ vào ô ghi chú khi đặt đơn để Admin xử lý nhanh.",
    "iconPath": "/assets/icons/mb-bank.jpg",
    "gradient": "from-blue-600 via-indigo-700 to-blue-900",
    "brandColor": "#002B49",
    "packages": [
      {
        "sku": "MB-VOUCHER-45K",
        "name": "Voucher Số Đẹp / Tài Khoản Số MB Bank",
        "price": 45000,
        "originalPrice": 100000,
        "duration": "Vĩnh Viễn",
        "durationDays": null,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Không bảo hành (KBH)",
        "benefits": [
          "Chọn số tài khoản đẹp chính chủ MB Bank",
          "Hỗ trợ mở số tứ quý, lộc phát, năm sinh",
          "Admin duyệt tay và hỗ trợ nhanh chóng"
        ],
        "usageConditions": [
          "Cung cấp SĐT đăng ký tài khoản MB Bank vào ô ghi chú khi đặt đơn"
        ],
        "stock": 999
      }
    ]
  },
  {
    "slug": "youtube",
    "name": "YouTube",
    "category": "Giải Trí & Video",
    "badgeLabel": "Không Quảng Cáo",
    "shortDesc": "Xem video không quảng cáo, phát trong nền và YouTube Music bản quyền.",
    "fullDesc": "Gói nâng cấp YouTube Premium chính chủ và slot gia đình bảo hành trọn thời gian.",
    "iconPath": "/assets/icons/products/youtube.jpg",
    "gradient": "from-red-500 to-rose-600",
    "brandColor": "#FF0000",
    "packages": [
      {
        "sku": "YT-SLOT-BHF-1M",
        "name": "[SLOT+BHF] Youtube Premium 1 Months",
        "price": 28000,
        "originalPrice": 79000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full thời gian sử dụng",
        "benefits": [
          "Chặn toàn bộ quảng cáo",
          "Phát nhạc trong nền khi tắt màn hình",
          "Bao gồm YouTube Music Premium"
        ],
        "usageConditions": [
          "Email cá nhân chính chủ"
        ],
        "stock": 50
      },
      {
        "sku": "YT-SLOT-BHF-3M",
        "name": "[SLOT+BHF] Youtube Premium 3 Months",
        "price": 199000,
        "originalPrice": 237000,
        "duration": "3 Tháng",
        "durationDays": 90,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full thời gian sử dụng",
        "benefits": [
          "Chặn quảng cáo trọn vẹn 3 tháng",
          "Nghe nhạc YouTube Music chất lượng cao"
        ],
        "usageConditions": [
          "Email cá nhân chính chủ"
        ],
        "stock": 40
      },
      {
        "sku": "YT-SLOT-BHF-6M",
        "name": "[SLOT+BHF] Youtube Premium 6 Months",
        "price": 359000,
        "originalPrice": 474000,
        "duration": "6 Tháng",
        "durationDays": 180,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full thời gian sử dụng",
        "benefits": [
          "Tiết kiệm chi phí",
          "Sử dụng liên tục không gián đoạn"
        ],
        "usageConditions": [
          "Cung cấp email nhận lời mời"
        ],
        "stock": 30
      },
      {
        "sku": "YT-SLOT-BHF-12M",
        "name": "[SLOT+BHF] Youtube Premium 12 Months",
        "price": 661000,
        "originalPrice": 948000,
        "duration": "12 Tháng",
        "durationDays": 365,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 365 ngày 1 đổi 1",
        "benefits": [
          "1 năm không quảng cáo",
          "Hỗ trợ đổi slot nếu có sự cố"
        ],
        "usageConditions": [
          "Email chính chủ"
        ],
        "stock": 25
      },
      {
        "sku": "YT-GMAIL-3M",
        "name": "[GMAIL] Youtube Premium 3 Months",
        "price": 125000,
        "originalPrice": 250000,
        "duration": "3 Tháng",
        "durationDays": 90,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành 3 tháng cấp sẵn tài khoản",
        "benefits": [
          "Cấp sẵn tài khoản Gmail Premium mới",
          "Đăng nhập ngay trên mọi thiết bị"
        ],
        "usageConditions": [
          "Không đổi thông tin khôi phục"
        ],
        "stock": 20
      }
    ]
  },
  {
    "slug": "capcut",
    "name": "CapCut",
    "category": "Đồ Họa & Biên Tập",
    "badgeLabel": "Trending Video",
    "shortDesc": "Biên tập video ngắn hàng đầu, kho template VIP và xuất video 4K sắc nét.",
    "fullDesc": "CapCut Pro mở khóa toàn bộ hiệu ứng, transition và âm thanh bản quyền thương mại.",
    "iconPath": "/assets/icons/products/capcut.jpg",
    "gradient": "from-neutral-800 to-black",
    "brandColor": "#000000",
    "packages": [
      {
        "sku": "CAPCUT-PRO-7D",
        "name": "[BHF] Capcut Pro Team 7 Days",
        "price": 17000,
        "originalPrice": 35000,
        "duration": "7 Ngày",
        "durationDays": 7,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 7 ngày",
        "benefits": [
          "Mở full tính năng Pro",
          "Xuất video 4K không watermark"
        ],
        "usageConditions": [
          "Tài khoản nhóm cấp sẵn hoặc add mail"
        ],
        "stock": 50
      },
      {
        "sku": "CAPCUT-PRO-12M",
        "name": "[BHF] Capcut Pro Team 12 Months",
        "price": 866000,
        "originalPrice": 1200000,
        "duration": "12 Tháng",
        "durationDays": 365,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 12 tháng",
        "benefits": [
          "Gói 1 năm trọn gói cho creator",
          "Sử dụng liên tục ổn định",
          "Tất cả hiệu ứng VIP"
        ],
        "usageConditions": [
          "Email chính chủ hoặc tài khoản cấp sẵn"
        ],
        "stock": 30
      }
    ]
  },
  {
    "slug": "chatgpt",
    "name": "ChatGPT & Codex API",
    "category": "Trí Tuệ Nhân Tạo AI",
    "badgeLabel": "Mô Hình Hàng Đầu",
    "shortDesc": "OpenAI GPT-4o, Codex API credits, canvas lập trình và xử lý đa phương thức.",
    "fullDesc": "Tài khoản ChatGPT Plus, Go, Team Business cùng gói Credit Codex API chất lượng cao.",
    "iconPath": "/assets/icons/products/chatgpt.jpg",
    "gradient": "from-emerald-600 to-teal-800",
    "brandColor": "#10A37F",
    "packages": [
      {
        "sku": "CHATGPT-GO-3M",
        "name": "[BH24H] Chatgpt Go 3 Months",
        "price": 154000,
        "originalPrice": 300000,
        "duration": "3 Tháng",
        "durationDays": 90,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành 24 giờ đầu kích hoạt",
        "benefits": [
          "Gói ChatGPT Go 3 tháng giá tốt",
          "Tốc độ phản hồi nhanh"
        ],
        "usageConditions": [
          "Tài khoản cấp sẵn"
        ],
        "stock": 20
      },
      {
        "sku": "CHATGPT-PLUS-1M",
        "name": "[KBH] Chatgpt Plus 1 Months",
        "price": 188000,
        "originalPrice": 490000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Không bảo hành (KBH)",
        "benefits": [
          "Truy cập GPT-4o, DALL-E 3, Voice Mode",
          "Gói giá siêu tiết kiệm"
        ],
        "usageConditions": [
          "Tài khoản cấp sẵn"
        ],
        "stock": 25
      },
      {
        "sku": "CHATGPT-TEAM-BIZ",
        "name": "[KBH] Chatgpt Team Bussiness",
        "price": 581000,
        "originalPrice": 1200000,
        "duration": "Theo Gói",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Không bảo hành (KBH)",
        "benefits": [
          "Workspace nhóm doanh nghiệp",
          "Hạn ngạch tin nhắn cao hơn"
        ],
        "usageConditions": [
          "Tài khoản cấp sẵn"
        ],
        "stock": 15
      },
      {
        "sku": "CHATGPT-PRO-X5-30D",
        "name": "[BH2D] ChatgptPro X5 30 Days",
        "price": 1847000,
        "originalPrice": 4500000,
        "duration": "30 Ngày",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành 2 ngày đầu",
        "benefits": [
          "Gói Pro X5 hiệu năng cực đại",
          "Hạn ngạch suy luận mở rộng"
        ],
        "usageConditions": [
          "Tài khoản cấp sẵn"
        ],
        "stock": 10
      },
      {
        "sku": "CODEX-10M-2D",
        "name": "Codex API 10M Credit - 2 ngày - BH Full",
        "price": 108000,
        "originalPrice": 150000,
        "duration": "2 Ngày",
        "durationDays": 2,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full thời gian gói",
        "benefits": [
          "10M Token/Credit",
          "Hỗ trợ code tự động"
        ],
        "usageConditions": [
          "API key hoặc session"
        ],
        "stock": 30
      },
      {
        "sku": "CODEX-20M-2D",
        "name": "Codex API 20M Credit - 2 ngày - BH Full",
        "price": 143000,
        "originalPrice": 200000,
        "duration": "2 Ngày",
        "durationDays": 2,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full thời gian gói",
        "benefits": [
          "20M Token/Credit",
          "Xử lý source code lớn"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 30
      },
      {
        "sku": "CODEX-50M-2D",
        "name": "Codex API 50M Credit - 2 ngày - BH Full",
        "price": 171000,
        "originalPrice": 250000,
        "duration": "2 Ngày",
        "durationDays": 2,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full thời gian gói",
        "benefits": [
          "50M Token/Credit",
          "Tối ưu cho dev dự án"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 25
      },
      {
        "sku": "CODEX-100M-1D",
        "name": "Codex API 100M Credit - 1 ngày - BH Full",
        "price": 160000,
        "originalPrice": 240000,
        "duration": "1 Ngày",
        "durationDays": 1,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 24h",
        "benefits": [
          "100M Token chạy trong ngày"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 20
      },
      {
        "sku": "CODEX-100M-5D",
        "name": "Codex API 100M Credit - 5 ngày - BH Full",
        "price": 239000,
        "originalPrice": 350000,
        "duration": "5 Ngày",
        "durationDays": 5,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 5 ngày",
        "benefits": [
          "100M Token hạn 5 ngày linh hoạt"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 20
      },
      {
        "sku": "CODEX-200M-1D",
        "name": "Codex API 200M Credit - 1 ngày - BH Full",
        "price": 239000,
        "originalPrice": 350000,
        "duration": "1 Ngày",
        "durationDays": 1,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 24h",
        "benefits": [
          "200M Token tốc độ cao"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 15
      },
      {
        "sku": "CODEX-500M-1D",
        "name": "Codex API 500M Credit - 1 ngày - BH Full",
        "price": 352000,
        "originalPrice": 500000,
        "duration": "1 Ngày",
        "durationDays": 1,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 24h",
        "benefits": [
          "500M Token dung lượng lớn"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 15
      },
      {
        "sku": "CODEX-1B-2D",
        "name": "Codex API 1B Credit - 2 ngày - BH Full",
        "price": 706000,
        "originalPrice": 990000,
        "duration": "2 Ngày",
        "durationDays": 2,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 2 ngày",
        "benefits": [
          "1 Tỷ Token Credit tối thượng"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 10
      }
    ]
  },
  {
    "slug": "gemini",
    "name": "Google Gemini",
    "category": "Google Gemini",
    "badgeLabel": "Google AI",
    "shortDesc": "Gói nâng cấp Google AI Ultra 5x & 20x (1 Tháng — Slot Family Chính Chủ).",
    "fullDesc": "Chính chủ Slot Family Google AI Ultra 5x (85.000đ) và Google AI Ultra 20x (145.000đ) thời hạn 1 tháng. Chỉ cần nhập Email Google nhận lời mời Family, không cần mật khẩu.",
    "iconPath": "/assets/icons/products/gemini.jpg",
    "gradient": "from-sky-500 to-blue-600",
    "brandColor": "#0EA5E9",
    "packages": [
      {
        "sku": "GEMINI-ULTRA-5X-1M",
        "name": "Google AI Ultra 5x (1 Tháng — Slot Family)",
        "price": 85000,
        "originalPrice": 250000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "fulfillment_mode": "MANUAL",
        "warranty": "Bảo hành 30 ngày (Slot riêng tư)",
        "warranty_days": 30,
        "warrantyDays": 30,
        "description": "Gói Google AI Ultra 5x (1 Tháng) nâng cấp chính chủ qua lời mời Google Family (Slot riêng tư). Chỉ cần nhập Email Google nhận lời mời.",
        "input_type": "email_only",
        "delivery_mode": "email_only",
        "custom_input_label": "Email Google nhận lời mời Slot Family (Không cần mật khẩu)",
        "sort_order": 1,
        "benefits": [
          "Truy cập Google AI Ultra 5x chính chủ trong 30 ngày",
          "Nâng cấp qua lời mời nhóm Google Family (Slot riêng tư)",
          "Chỉ cần nhập Email Google, không cần cung cấp mật khẩu"
        ],
        "usageConditions": [
          "Nhập chính xác Email Google cần nhận lời mời Family",
          "Tài khoản chưa tham gia nhóm Family nào trong 12 tháng gần nhất"
        ],
        "stock": 99
      },
      {
        "sku": "GEMINI-ULTRA-20X-1M",
        "name": "Google AI Ultra 20x (1 Tháng — Slot Family)",
        "price": 145000,
        "originalPrice": 450000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "fulfillment_mode": "MANUAL",
        "warranty": "Bảo hành 30 ngày (Slot riêng tư)",
        "warranty_days": 30,
        "warrantyDays": 30,
        "description": "Gói Google AI Ultra 20x (1 Tháng) cao cấp nâng cấp chính chủ qua lời mời Google Family (Slot riêng tư). Chỉ cần nhập Email Google.",
        "input_type": "email_only",
        "delivery_mode": "email_only",
        "custom_input_label": "Email Google nhận lời mời Slot Family (Không cần mật khẩu)",
        "sort_order": 2,
        "benefits": [
          "Hạn mức Ultra 20x mạnh nhất cho Veo, Deep Research & Coding",
          "Nâng cấp chính chủ qua nhóm Google Family (Slot riêng tư)",
          "Chỉ yêu cầu nhập Email Google nhận lời mời Family"
        ],
        "usageConditions": [
          "Nhập chính xác Email Google cần nhận lời mời Family",
          "Tài khoản chưa tham gia nhóm Family nào trong 12 tháng gần nhất"
        ],
        "stock": 99
      },
      {
        "sku": "GEMINI-PRO-3M",
        "name": "Gemini Pro 3 Tháng",
        "price": 79000,
        "originalPrice": 180000,
        "duration": "3 Tháng",
        "durationDays": 90,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Không bảo hành (KBH)",
        "warranty_days": 0,
        "warrantyDays": 0,
        "description": "Gói nâng cấp Gemini Pro thời hạn 3 tháng. Duyệt tay qua Bot Telegram (KBH).",
        "input_type": "admin_deliver",
        "delivery_mode": "admin_deliver",
        "benefits": [
          "Gói nâng cấp Gemini Pro thời hạn 3 tháng",
          "Xử lý đa phương thức, duyệt tay chuẩn xác qua Bot Telegram"
        ],
        "usageConditions": [
          "Gói Không Bảo Hành (KBH) — đọc kỹ điều kiện trước khi đặt",
          "Nhập Gmail / Telegram nhận đơn để Admin bàn giao"
        ],
        "stock": 50
      },
      {
        "sku": "GEMINI-PLUS-6M-SLOT",
        "name": "Gemini Plus 6 Tháng [Slot]",
        "price": 45000,
        "originalPrice": 120000,
        "duration": "6 Tháng",
        "durationDays": 180,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Không bảo hành (KBH)",
        "warranty_days": 0,
        "warrantyDays": 0,
        "description": "Gói Gemini Plus dùng Slot thời hạn 6 tháng. Duyệt tay qua Bot Telegram (KBH).",
        "input_type": "admin_deliver",
        "delivery_mode": "admin_deliver",
        "benefits": [
          "Truy cập Gemini Plus ổn định thời hạn 6 tháng [Slot]",
          "Chi phí tối ưu, bàn giao nhanh qua Bot Telegram"
        ],
        "usageConditions": [
          "Gói Không Bảo Hành (KBH) — sử dụng đúng hướng dẫn slot",
          "Nhập Telegram hoặc Gmail nhận thông tin"
        ],
        "stock": 50
      },
      {
        "sku": "GEMINI-PRO-12M-STUDENT",
        "name": "Gemini Pro 12 Tháng Student",
        "price": 75000,
        "originalPrice": 240000,
        "duration": "12 Tháng",
        "durationDays": 365,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Không bảo hành (KBH)",
        "warranty_days": 0,
        "warrantyDays": 0,
        "description": "Gói Gemini Pro ưu đãi Student thời hạn 12 tháng. Duyệt tay qua Bot Telegram (KBH).",
        "input_type": "admin_deliver",
        "delivery_mode": "admin_deliver",
        "benefits": [
          "Thời hạn sử dụng 12 tháng gói Gemini Pro Student",
          "Tối ưu học tập, nghiên cứu tài liệu và lập trình"
        ],
        "usageConditions": [
          "Gói Không Bảo Hành (KBH)",
          "Nhập Gmail / Telegram nhận đơn để Admin duyệt tay"
        ],
        "stock": 50
      }
    ]
  },
  {
    "slug": "grok",
    "name": "Grok",
    "category": "Trí Tuệ Nhân Tạo AI",
    "badgeLabel": "xAI Elon Musk",
    "shortDesc": "Mô hình AI suy luận tự do, cập nhật thông tin thời gian thực từ nền tảng X.",
    "fullDesc": "Tài khoản Grok Plus, Grok Super và các gói Credit API từ xAI.",
    "iconPath": "/assets/icons/products/grok.jpg",
    "gradient": "from-zinc-800 to-black",
    "brandColor": "#000000",
    "packages": [
      {
        "sku": "GROK-10M-3D",
        "name": "Grok API 10M Credit - 3 ngày - BHF",
        "price": 171000,
        "originalPrice": 250000,
        "duration": "3 Ngày",
        "durationDays": 3,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 3 ngày",
        "benefits": [
          "10M Credit API Grok",
          "Tốc độ phản hồi real-time"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 25
      },
      {
        "sku": "GROK-30M-3D",
        "name": "Grok API 30M Credit - 3 ngày - BHF",
        "price": 228000,
        "originalPrice": 320000,
        "duration": "3 Ngày",
        "durationDays": 3,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 3 ngày",
        "benefits": [
          "30M Credit API Grok"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 20
      },
      {
        "sku": "GROK-50M-3D",
        "name": "Grok API 50M Credit - 3 ngày - BHF",
        "price": 291000,
        "originalPrice": 400000,
        "duration": "3 Ngày",
        "durationDays": 3,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 3 ngày",
        "benefits": [
          "50M Credit API Grok"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 20
      },
      {
        "sku": "GROK-100M-5D",
        "name": "Grok API 100M Credit - 5 ngày - BHF",
        "price": 456000,
        "originalPrice": 650000,
        "duration": "5 Ngày",
        "durationDays": 5,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 5 ngày",
        "benefits": [
          "100M Credit hạn 5 ngày"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 15
      },
      {
        "sku": "GROK-200M-5D",
        "name": "Grok API 200M Credit - 5 ngày - BHF",
        "price": 741000,
        "originalPrice": 990000,
        "duration": "5 Ngày",
        "durationDays": 5,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 5 ngày",
        "benefits": [
          "200M Credit API Grok"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 10
      },
      {
        "sku": "GROK-SUPER-15X-1M",
        "name": "Grok Super 15X - 1 tháng - BH 24H",
        "price": 1596000,
        "originalPrice": 2500000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành 24h đầu",
        "benefits": [
          "Grok Super 15X hiệu năng cao",
          "Dành cho nghiên cứu chuyên sâu"
        ],
        "usageConditions": [
          "Tài khoản cấp sẵn"
        ],
        "stock": 10
      },
      {
        "sku": "GROK-SUPER-1D",
        "name": "Grok Super - 1 ngày - KBH",
        "price": 137000,
        "originalPrice": 200000,
        "duration": "1 Ngày",
        "durationDays": 1,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Không bảo hành (KBH)",
        "benefits": [
          "Trải nghiệm Grok Super trong ngày"
        ],
        "usageConditions": [
          "Tài khoản cấp sẵn"
        ],
        "stock": 30
      },
      {
        "sku": "GROK-PLUS-30D",
        "name": "Grok Plus - 30 ngày - BH 24H",
        "price": 217000,
        "originalPrice": 400000,
        "duration": "30 Ngày",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành 24h đầu",
        "benefits": [
          "Gói Grok Plus 30 ngày chuẩn"
        ],
        "usageConditions": [
          "Tài khoản cấp sẵn"
        ],
        "stock": 25
      }
    ]
  },
  {
    "slug": "deepseek",
    "name": "DeepSeek",
    "category": "Trí Tuệ Nhân Tạo AI",
    "badgeLabel": "Toán & Lập Trình",
    "shortDesc": "Mô hình AI suy luận mã nguồn mở hàng đầu với hiệu năng vượt trội.",
    "fullDesc": "DeepSeek API và các gói Token DeepSeek-V3, DeepSeek-R1 suy luận logic cao.",
    "iconPath": "/assets/icons/products/deepseek.jpg",
    "gradient": "from-blue-700 to-indigo-900",
    "brandColor": "#0066FF",
    "packages": [
      {
        "sku": "DEEPSEEK-10USD-1M",
        "name": "DeepSeek API 10$ - 1 tháng - BH Full",
        "price": 101000,
        "originalPrice": 150000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "10$ Credit DeepSeek",
          "Mô hình V3 và R1"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 30
      },
      {
        "sku": "DEEPSEEK-30USD-1M",
        "name": "DeepSeek API 30$ - 1 tháng - BH Full",
        "price": 136000,
        "originalPrice": 220000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "30$ Credit DeepSeek"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 25
      },
      {
        "sku": "DEEPSEEK-50USD-1M",
        "name": "DeepSeek API 50$ - 1 tháng - BH Full",
        "price": 177000,
        "originalPrice": 300000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "50$ Credit DeepSeek"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 20
      },
      {
        "sku": "DEEPSEEK-100USD-1M",
        "name": "DeepSeek API 100$ - 1 tháng - BH Full",
        "price": 284000,
        "originalPrice": 450000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "100$ Credit DeepSeek"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 20
      },
      {
        "sku": "DEEPSEEK-200USD-1M",
        "name": "DeepSeek API 200$ - 1 tháng - BH Full",
        "price": 455000,
        "originalPrice": 700000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "200$ Credit DeepSeek"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 15
      },
      {
        "sku": "DEEPSEEK-50M-TOKENS-2D",
        "name": "DeepSeek Model 50M Tokens - 2 ngày",
        "price": 171000,
        "originalPrice": 250000,
        "duration": "2 Ngày",
        "durationDays": 2,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành 2 ngày",
        "benefits": [
          "50 Triệu Tokens DeepSeek Model"
        ],
        "usageConditions": [
          "Token kết nối trực tiếp"
        ],
        "stock": 20
      },
      {
        "sku": "DEEPSEEK-100M-TOKENS-4D",
        "name": "DeepSeek Model 100M Tokens - 4 ngày",
        "price": 245000,
        "originalPrice": 380000,
        "duration": "4 Ngày",
        "durationDays": 4,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành 4 ngày",
        "benefits": [
          "100 Triệu Tokens DeepSeek Model"
        ],
        "usageConditions": [
          "Token kết nối trực tiếp"
        ],
        "stock": 15
      },
      {
        "sku": "DEEPSEEK-500M-TOKENS-7D",
        "name": "DeepSeek Model 500M Tokens - 7 ngày",
        "price": 945000,
        "originalPrice": 1400000,
        "duration": "7 Ngày",
        "durationDays": 7,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành 7 ngày",
        "benefits": [
          "500 Triệu Tokens xử lý dữ liệu lớn"
        ],
        "usageConditions": [
          "Token kết nối trực tiếp"
        ],
        "stock": 10
      }
    ]
  },
  {
    "slug": "claude",
    "name": "Claude",
    "category": "Trí Tuệ Nhân Tạo AI",
    "badgeLabel": "Anthropic AI",
    "shortDesc": "Claude 3.5 Sonnet & Opus với khả năng lập trình và phân tích văn bản đỉnh cao.",
    "fullDesc": "Gói Claude API, Token Credits và tài khoản Direct chất lượng ổn định nhất.",
    "iconPath": "/assets/icons/products/claude.jpg",
    "gradient": "from-amber-700 via-orange-600 to-rose-700",
    "brandColor": "#D97706",
    "packages": [
      {
        "sku": "CLAUDE-10USD-1M",
        "name": "Claude API 10$ - 1 tháng - BH Full",
        "price": 97000,
        "originalPrice": 150000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "10$ Credit Claude API"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 30
      },
      {
        "sku": "CLAUDE-30USD-1M",
        "name": "Claude API 30$ - 1 tháng - BH Full",
        "price": 120000,
        "originalPrice": 200000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "30$ Credit Claude API"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 30
      },
      {
        "sku": "CLAUDE-50USD-1M",
        "name": "Claude API 50$ - 1 tháng - BH Full",
        "price": 148000,
        "originalPrice": 250000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "50$ Credit Claude API"
        ],
        "usageConditions": [
          "API key cấp sẵn"
        ],
        "stock": 25
      },
      {
        "sku": "CLAUDE-50USD-TOKEN-30D",
        "name": "Claude API 50$ Token - 30 ngày - BH Full",
        "price": 199000,
        "originalPrice": 300000,
        "duration": "30 Ngày",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 30 ngày",
        "benefits": [
          "50$ Token Claude"
        ],
        "usageConditions": [
          "API token"
        ],
        "stock": 25
      },
      {
        "sku": "CLAUDE-100USD-TOKEN-30D",
        "name": "Claude API 100$ Token - 30 ngày - BH Full",
        "price": 279000,
        "originalPrice": 420000,
        "duration": "30 Ngày",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 30 ngày",
        "benefits": [
          "100$ Token Claude"
        ],
        "usageConditions": [
          "API token"
        ],
        "stock": 20
      },
      {
        "sku": "CLAUDE-500USD-TOKEN-30D",
        "name": "Claude API 500$ Token - 30 ngày - BH Full",
        "price": 467000,
        "originalPrice": 750000,
        "duration": "30 Ngày",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 30 ngày",
        "benefits": [
          "500$ Token Claude"
        ],
        "usageConditions": [
          "API token"
        ],
        "stock": 15
      },
      {
        "sku": "CLAUDE-10M-TOKEN-1M",
        "name": "Claude API 10M Token - 1 tháng - BHF",
        "price": 85000,
        "originalPrice": 150000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "10 Triệu Token Claude"
        ],
        "usageConditions": [
          "API key"
        ],
        "stock": 30
      },
      {
        "sku": "CLAUDE-20M-TOKEN-1D",
        "name": "Claude API 20M Token - 1 ngày - BH Full",
        "price": 131000,
        "originalPrice": 200000,
        "duration": "1 Ngày",
        "durationDays": 1,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 ngày",
        "benefits": [
          "20 Triệu Token trong ngày"
        ],
        "usageConditions": [
          "API key"
        ],
        "stock": 25
      },
      {
        "sku": "CLAUDE-50M-TOKEN-1D",
        "name": "Claude API 50M Token - 1 ngày - BH Full",
        "price": 188000,
        "originalPrice": 280000,
        "duration": "1 Ngày",
        "durationDays": 1,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 ngày",
        "benefits": [
          "50 Triệu Token tốc độ cao"
        ],
        "usageConditions": [
          "API key"
        ],
        "stock": 20
      },
      {
        "sku": "CLAUDE-100M-TOKEN-1D",
        "name": "Claude API 100M Token - 1 ngày - BH Full",
        "price": 325000,
        "originalPrice": 450000,
        "duration": "1 Ngày",
        "durationDays": 1,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 ngày",
        "benefits": [
          "100 Triệu Token trong ngày"
        ],
        "usageConditions": [
          "API key"
        ],
        "stock": 15
      },
      {
        "sku": "CLAUDE-100M-TOKEN-3D",
        "name": "Claude API 100M Token - 3 ngày - BH Full",
        "price": 427000,
        "originalPrice": 600000,
        "duration": "3 Ngày",
        "durationDays": 3,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 3 ngày",
        "benefits": [
          "100 Triệu Token hạn 3 ngày"
        ],
        "usageConditions": [
          "API key"
        ],
        "stock": 15
      },
      {
        "sku": "CLAUDE-100M-TOKEN-7D",
        "name": "Claude API 100M Token - 7 ngày - BH Full",
        "price": 416000,
        "originalPrice": 580000,
        "duration": "7 Ngày",
        "durationDays": 7,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 7 ngày",
        "benefits": [
          "100 Triệu Token hạn 7 ngày"
        ],
        "usageConditions": [
          "API key"
        ],
        "stock": 15
      },
      {
        "sku": "CLAUDE-200M-TOKEN-7D",
        "name": "Claude API 200M Token - 7 ngày - BH Full",
        "price": 542000,
        "originalPrice": 750000,
        "duration": "7 Ngày",
        "durationDays": 7,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 7 ngày",
        "benefits": [
          "200 Triệu Token hạn 7 ngày"
        ],
        "usageConditions": [
          "API key"
        ],
        "stock": 12
      },
      {
        "sku": "CLAUDE-200M-TOKEN-30D",
        "name": "Claude API 200M Token - 30 ngày - BH Full",
        "price": 626000,
        "originalPrice": 890000,
        "duration": "30 Ngày",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 30 ngày",
        "benefits": [
          "200 Triệu Token hạn 1 tháng"
        ],
        "usageConditions": [
          "API key"
        ],
        "stock": 12
      },
      {
        "sku": "CLAUDE-500M-TOKEN-30D",
        "name": "Claude API 500M Token - 30 ngày - BH Full",
        "price": 899000,
        "originalPrice": 1300000,
        "duration": "30 Ngày",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 30 ngày",
        "benefits": [
          "500 Triệu Token hạn 1 tháng"
        ],
        "usageConditions": [
          "API key"
        ],
        "stock": 10
      },
      {
        "sku": "CLAUDE-1B-TOKEN-30D",
        "name": "Claude API 1B Token - 30 ngày - BH Full",
        "price": 1459000,
        "originalPrice": 2100000,
        "duration": "30 Ngày",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 30 ngày",
        "benefits": [
          "1 Tỷ Token Claude"
        ],
        "usageConditions": [
          "API key"
        ],
        "stock": 8
      },
      {
        "sku": "CLAUDE-100USD-DIRECT-1M",
        "name": "Claude API 100$ - 1 tháng - BH Full (Gói cao cấp)",
        "price": 272000,
        "originalPrice": 400000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "Direct API 100$ chính hãng"
        ],
        "usageConditions": [
          "API key"
        ],
        "stock": 15
      },
      {
        "sku": "CLAUDE-200USD-DIRECT-1M",
        "name": "Claude API 200$ - 1 tháng - BH Full",
        "price": 478000,
        "originalPrice": 700000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "Direct API 200$ chính hãng"
        ],
        "usageConditions": [
          "API key"
        ],
        "stock": 10
      },
      {
        "sku": "CLAUDE-300USD-DIRECT-1M",
        "name": "Claude API 300$ - 1 tháng - BH Full",
        "price": 728000,
        "originalPrice": 1050000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "Direct API 300$ chính hãng"
        ],
        "usageConditions": [
          "API key"
        ],
        "stock": 10
      },
      {
        "sku": "CLAUDE-500USD-DIRECT-1M",
        "name": "Claude API 500$ - 1 tháng - BH Full",
        "price": 1082000,
        "originalPrice": 1550000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "Direct API 500$ chính hãng"
        ],
        "usageConditions": [
          "API key"
        ],
        "stock": 8
      },
      {
        "sku": "CLAUDE-1000USD-DIRECT-1M",
        "name": "Claude API 1000$ - 1 tháng - BH Full",
        "price": 2393000,
        "originalPrice": 3500000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "Direct API 1.000$ tối thượng"
        ],
        "usageConditions": [
          "API key"
        ],
        "stock": 5
      }
    ]
  },
  {
    "slug": "museai",
    "name": "Muse AI",
    "category": "Muse AI",
    "badgeLabel": "Video & Audio",
    "shortDesc": "Nền tảng tạo video, lưu trữ và phát trực tuyến AI thế hệ mới.",
    "fullDesc": "Muse AI cung cấp kho lưu trữ và công cụ AI xử lý video âm thanh đỉnh cao.",
    "iconPath": "/assets/icons/products/museai.jpg",
    "gradient": "from-fuchsia-600 to-purple-800",
    "brandColor": "#C026D3",
    "packages": [
      {
        "sku": "MUSE-AI-1B-TOKENS",
        "name": "Muse AI 1B Tokens (Gói VIP)",
        "price": 12000,
        "originalPrice": 60000,
        "duration": "Theo Gói",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "fulfillment_mode": "MANUAL",
        "warranty": "Không bảo hành (KBH)",
        "warranty_days": 0,
        "warrantyDays": 0,
        "description": "Cấp hạn mức 1 tỷ tokens gói VIP trên Muse AI. Yêu cầu nhập Tài khoản & Mật khẩu cần kích hoạt.",
        "input_type": "credentials",
        "delivery_mode": "credentials",
        "custom_input_label": "Tài khoản & Mật khẩu Muse AI cần nâng cấp",
        "requires_credentials": true,
        "sort_order": 3,
        "benefits": [
          "Cấp hạn mức 1 tỷ tokens trên nền tảng Muse AI",
          "Xử lý và tạo video AI chất lượng cao"
        ],
        "usageConditions": [
          "Yêu cầu nhập thông tin: Tài khoản | Mật khẩu | 2FA",
          "Vui lòng tắt xác minh 2 bước qua SĐT/thiết bị để xử lý nhanh"
        ],
        "stock": 50
      },
      {
        "sku": "MUSE-AI-31B-TOKENS",
        "name": "[KBH] Muse Ai 31B Tokens",
        "price": 36000,
        "originalPrice": 90000,
        "duration": "Theo Gói",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Không bảo hành (KBH)",
        "benefits": [
          "31 Tỷ Tokens xử lý video AI",
          "Lưu trữ đám mây không giới hạn"
        ],
        "usageConditions": [
          "Tài khoản cấp sẵn"
        ],
        "stock": 40
      }
    ]
  },
  {
    "slug": "canva",
    "name": "Canva",
    "category": "Đồ Họa & Biên Tập",
    "badgeLabel": "Thiết Kế Số 1",
    "shortDesc": "Thiết kế đồ họa trực tuyến số 1, kho mẫu bản quyền không giới hạn.",
    "fullDesc": "Canva Pro và Canva Edu mở full font chữ, template VIP và tính năng xóa phông.",
    "iconPath": "/assets/icons/products/canva.jpg",
    "gradient": "from-cyan-500 to-blue-600",
    "brandColor": "#00C4CC",
    "packages": [
      {
        "sku": "CANVA-EDU-1Y",
        "name": "[BH3M] Canva Edu 1 Years",
        "price": 40000,
        "originalPrice": 70000,
        "duration": "1 Năm",
        "durationDays": 365,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành 3 tháng 1 đổi 1",
        "benefits": [
          "Nâng cấp email chính chủ",
          "Kho template Edu & Pro phong phú",
          "Xóa phông ảnh 1 chạm"
        ],
        "usageConditions": [
          "Cung cấp email nhận thư mời"
        ],
        "stock": 60
      },
      {
        "sku": "CANVA-EDU-3Y",
        "name": "[KBH] Canva Edu 3 Years",
        "price": 26000,
        "originalPrice": 100000,
        "duration": "3 Năm",
        "durationDays": 1095,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Không bảo hành (KBH)",
        "benefits": [
          "Sử dụng 3 năm giá siêu rẻ",
          "Kho template phong phú"
        ],
        "usageConditions": [
          "Email chính chủ"
        ],
        "stock": 50
      },
      {
        "sku": "CANVA-PRO-1Y-TEAM",
        "name": "[BHF] Canva Pro 1 Years Add Team",
        "price": 147000,
        "originalPrice": 250000,
        "duration": "1 Năm",
        "durationDays": 365,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 năm",
        "benefits": [
          "Brand Kit thương hiệu",
          "Đầy đủ mọi tính năng Pro",
          "Tải ảnh PNG nền trong suốt"
        ],
        "usageConditions": [
          "Email chính chủ"
        ],
        "stock": 35
      }
    ]
  },
  {
    "slug": "netflix",
    "name": "Netflix",
    "category": "Giải Trí & Video",
    "badgeLabel": "Phim 4K HDR",
    "shortDesc": "Xem phim bom tấn, series truyền hình chất lượng 4K Ultra HD.",
    "fullDesc": "Netflix gói Private riêng tư và gói 4K bản quyền chính hãng.",
    "iconPath": "/assets/icons/products/netflix.svg",
    "gradient": "from-red-600 to-black",
    "brandColor": "#E50914",
    "packages": [
      {
        "sku": "NETFLIX-PRIVATE-4K-30D",
        "name": "[SLOT+BHF] Netflix Private 4K 30 Days",
        "price": 85000,
        "originalPrice": 150000,
        "duration": "30 Ngày",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 30 ngày",
        "benefits": [
          "Profile riêng tư có mã PIN",
          "Chất lượng 4K UHD cao cấp",
          "Không vướng xác minh hộ gia đình"
        ],
        "usageConditions": [
          "Không đổi thông tin tài khoản"
        ],
        "stock": 40
      },
      {
        "sku": "NETFLIX-PRIVATE-4K-6M",
        "name": "[SLOT+BHF] Netflix Private 4K 6 Months",
        "price": 638000,
        "originalPrice": 900000,
        "duration": "6 Tháng",
        "durationDays": 180,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 6 tháng",
        "benefits": [
          "Tiết kiệm chi phí nửa năm",
          "Ổn định không gián đoạn"
        ],
        "usageConditions": [
          "Dùng đúng profile được cấp"
        ],
        "stock": 20
      },
      {
        "sku": "NETFLIX-4K-1M",
        "name": "[BHF] Netflix 4K 1 Months",
        "price": 182000,
        "originalPrice": 260000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "Tài khoản riêng chính chủ",
          "Đăng nhập cùng lúc nhiều thiết bị"
        ],
        "usageConditions": [
          "Tài khoản cấp sẵn"
        ],
        "stock": 20
      }
    ]
  },
  {
    "slug": "duolingo",
    "name": "Duolingo",
    "category": "Học Tập & Ngôn Ngữ",
    "badgeLabel": "Super Duolingo",
    "shortDesc": "Học ngoại ngữ thông minh không giới hạn trái tim, không quảng cáo.",
    "fullDesc": "Nâng cấp Super Duolingo chính chủ học trọn vẹn mọi bài học ngữ pháp và từ vựng.",
    "iconPath": "/assets/icons/products/duolingo.jpg",
    "gradient": "from-lime-500 to-green-600",
    "brandColor": "#58CC02",
    "packages": [
      {
        "sku": "DUOLINGO-SUPER-12M",
        "name": "[BHF] Duolingo Super 12 Months",
        "price": 272000,
        "originalPrice": 590000,
        "duration": "12 Tháng",
        "durationDays": 365,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 12 tháng",
        "benefits": [
          "Trái tim vô hạn không sợ làm sai",
          "Luyện tập phát âm và bài học cá nhân hóa",
          "Không có quảng cáo"
        ],
        "usageConditions": [
          "Email chính chủ"
        ],
        "stock": 30
      }
    ]
  },
  {
    "slug": "vpn",
    "name": "VPN (HMA & ExpressVPN)",
    "category": "Bảo Mật & Tiện Ích",
    "badgeLabel": "Đổi IP Vượt Rào",
    "shortDesc": "Bảo mật kết nối Internet, ẩn danh và fake IP tốc độ cao trên PC/Mobile.",
    "fullDesc": "Key kích hoạt bản quyền chính hãng HMA VPN và ExpressVPN.",
    "iconPath": "/assets/icons/products/expressvpn.jpg",
    "gradient": "from-rose-600 via-red-600 to-amber-600",
    "brandColor": "#DA3743",
    "packages": [
      {
        "sku": "HMA-KEY-20-30D",
        "name": "[KEY] HMA ANDROID/PC 20-30D",
        "price": 18000,
        "originalPrice": 40000,
        "duration": "20-30 Ngày",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành theo thời hạn key",
        "benefits": [
          "Hàng trăm quốc gia và thành phố",
          "Dùng cho Android và Windows PC"
        ],
        "usageConditions": [
          "Nhập key trong app chính thức"
        ],
        "stock": 50
      },
      {
        "sku": "EXPRESSVPN-KEY-25-30D",
        "name": "[KEY] EXPRESS VPN 25-30D",
        "price": 63000,
        "originalPrice": 120000,
        "duration": "25-30 Ngày",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành theo thời hạn key",
        "benefits": [
          "Tốc độ cao nhất thế giới",
          "Bảo mật mã hóa cấp quân sự"
        ],
        "usageConditions": [
          "Nhập key trong app ExpressVPN"
        ],
        "stock": 40
      }
    ]
  },
  {
    "slug": "klingai",
    "name": "Kling AI",
    "category": "Trí Tuệ Nhân Tạo AI",
    "badgeLabel": "Tạo Video AI",
    "shortDesc": "Công cụ tạo video AI chân thực, chuyển động mượt mà hàng đầu.",
    "fullDesc": "Gói Credit Kling AI và Premier dành cho các studio sản xuất nội dung số.",
    "iconPath": "/assets/icons/products/klingai.jpg",
    "gradient": "from-violet-600 to-indigo-800",
    "brandColor": "#7C3AED",
    "packages": [
      {
        "sku": "KLING-65-CREDITS-1M",
        "name": "[BHF] Kling 65 Credits 1 Months",
        "price": 51000,
        "originalPrice": 100000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "65 Credits tạo video sắc nét",
          "Xuất video không watermark"
        ],
        "usageConditions": [
          "Tài khoản cấp sẵn"
        ],
        "stock": 30
      },
      {
        "sku": "KLING-PREMIER-8900-1M",
        "name": "[BH72H] Kling Premier 8900 Credits 1 Months",
        "price": 1590000,
        "originalPrice": 2500000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành 72 giờ đầu",
        "benefits": [
          "8.900 Credits khổng lồ",
          "Ưu tiên hàng đợi GPU nhanh nhất"
        ],
        "usageConditions": [
          "Tài khoản cấp sẵn"
        ],
        "stock": 10
      },
      {
        "sku": "KLING-KEY-50K",
        "name": "[BHF] Key Kling AI 50K",
        "price": 90000,
        "originalPrice": 150000,
        "duration": "Theo Gói",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full",
        "benefits": [
          "Key kích hoạt 50k credit",
          "Dễ dàng nạp vào tài khoản"
        ],
        "usageConditions": [
          "Nhập mã redeem"
        ],
        "stock": 25
      }
    ]
  },
  {
    "slug": "higgsfield",
    "name": "Higgsfield",
    "category": "Trí Tuệ Nhân Tạo AI",
    "badgeLabel": "AI Video Genjutsu",
    "shortDesc": "Công nghệ tạo video cinematic từ camera và văn bản.",
    "fullDesc": "Higgsfield AI Genjutsu mang lại hiệu ứng chuyển động điện ảnh chuyên nghiệp.",
    "iconPath": "/assets/icons/products/higgsfield.jpg",
    "gradient": "from-emerald-700 to-teal-900",
    "brandColor": "#059669",
    "packages": [
      {
        "sku": "HIGGSFIELD-GENJUTSU-30D",
        "name": "[BH24H] HIGGFIELD GENJUTSU 30 Day",
        "price": 44000,
        "originalPrice": 90000,
        "duration": "30 Ngày",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành 24 giờ đầu",
        "benefits": [
          "Gói Genjutsu 30 ngày",
          "Tạo chuyển động nhân vật cinematic"
        ],
        "usageConditions": [
          "Tài khoản cấp sẵn"
        ],
        "stock": 30
      }
    ]
  },
  {
    "slug": "minimax",
    "name": "MiniMax",
    "category": "Trí Tuệ Nhân Tạo AI",
    "badgeLabel": "Hailuo AI Video",
    "shortDesc": "Mô hình tạo video Hailuo AI chuyển động người và vật thể sống động.",
    "fullDesc": "Các gói Redeem Credit MiniMax giá mềm phù hợp mọi nhu cầu sáng tạo.",
    "iconPath": "/assets/icons/products/minimax.jpg",
    "gradient": "from-amber-600 to-orange-700",
    "brandColor": "#EA580C",
    "packages": [
      {
        "sku": "MINIMAX-REDEEM-100K",
        "name": "MiniMax Redeem 100K Credit",
        "price": 79000,
        "originalPrice": 120000,
        "duration": "Theo Gói",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành code kích hoạt",
        "benefits": [
          "100.000 Credits MiniMax"
        ],
        "usageConditions": [
          "Code redeem"
        ],
        "stock": 30
      },
      {
        "sku": "MINIMAX-REDEEM-131K",
        "name": "MiniMax Redeem 131K Credit",
        "price": 170000,
        "originalPrice": 250000,
        "duration": "Theo Gói",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành code kích hoạt",
        "benefits": [
          "131.000 Credits MiniMax"
        ],
        "usageConditions": [
          "Code redeem"
        ],
        "stock": 25
      },
      {
        "sku": "MINIMAX-REDEEM-300K",
        "name": "MiniMax Redeem 300K Credit",
        "price": 250000,
        "originalPrice": 380000,
        "duration": "Theo Gói",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành code kích hoạt",
        "benefits": [
          "300.000 Credits MiniMax"
        ],
        "usageConditions": [
          "Code redeem"
        ],
        "stock": 20
      },
      {
        "sku": "MINIMAX-REDEEM-1M",
        "name": "MiniMax Redeem 1M Credit",
        "price": 489000,
        "originalPrice": 700000,
        "duration": "Theo Gói",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành code kích hoạt",
        "benefits": [
          "1 Triệu Credits MiniMax"
        ],
        "usageConditions": [
          "Code redeem"
        ],
        "stock": 15
      },
      {
        "sku": "MINIMAX-REDEEM-3M",
        "name": "MiniMax Redeem 3M Credit",
        "price": 1082000,
        "originalPrice": 1500000,
        "duration": "Theo Gói",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành code kích hoạt",
        "benefits": [
          "3 Triệu Credits MiniMax"
        ],
        "usageConditions": [
          "Code redeem"
        ],
        "stock": 10
      },
      {
        "sku": "MINIMAX-REDEEM-7M",
        "name": "MiniMax Redeem 7M Credit",
        "price": 2507000,
        "originalPrice": 3500000,
        "duration": "Theo Gói",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành code kích hoạt",
        "benefits": [
          "7 Triệu Credits tối thượng"
        ],
        "usageConditions": [
          "Code redeem"
        ],
        "stock": 8
      }
    ]
  },
  {
    "slug": "elevenlabs",
    "name": "ElevenLabs",
    "category": "Trí Tuệ Nhân Tạo AI",
    "badgeLabel": "Giọng Đọc AI Số 1",
    "shortDesc": "Giọng đọc và nhân bản giọng nói AI tự nhiên, hỗ trợ tiếng Việt mượt mà.",
    "fullDesc": "Các gói Redeem Credit ElevenLabs chính thức cho voiceover, lồng tiếng video và podcast.",
    "iconPath": "/assets/icons/products/elevenlabs.jpg",
    "gradient": "from-slate-800 to-black",
    "brandColor": "#000000",
    "packages": [
      {
        "sku": "ELEVENLABS-REDEEM-100K",
        "name": "ElevenLabs Redeem 100K Credit",
        "price": 113000,
        "originalPrice": 180000,
        "duration": "Theo Gói",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành code kích hoạt",
        "benefits": [
          "100.000 ký tự / Credits",
          "Clone giọng nói chất lượng cao"
        ],
        "usageConditions": [
          "Nhập mã redeem"
        ],
        "stock": 30
      },
      {
        "sku": "ELEVENLABS-REDEEM-131K",
        "name": "ElevenLabs Redeem 131K Credit",
        "price": 165000,
        "originalPrice": 250000,
        "duration": "Theo Gói",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành code kích hoạt",
        "benefits": [
          "131.000 ký tự / Credits"
        ],
        "usageConditions": [
          "Nhập mã redeem"
        ],
        "stock": 25
      },
      {
        "sku": "ELEVENLABS-REDEEM-300K",
        "name": "ElevenLabs Redeem 300K Credit",
        "price": 295000,
        "originalPrice": 450000,
        "duration": "Theo Gói",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành code kích hoạt",
        "benefits": [
          "300.000 ký tự / Credits"
        ],
        "usageConditions": [
          "Nhập mã redeem"
        ],
        "stock": 20
      },
      {
        "sku": "ELEVENLABS-REDEEM-1M",
        "name": "ElevenLabs Redeem 1M Credit",
        "price": 489000,
        "originalPrice": 750000,
        "duration": "Theo Gói",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành code kích hoạt",
        "benefits": [
          "1 Triệu ký tự / Credits"
        ],
        "usageConditions": [
          "Nhập mã redeem"
        ],
        "stock": 15
      },
      {
        "sku": "ELEVENLABS-REDEEM-3M",
        "name": "ElevenLabs Redeem 3M Credit",
        "price": 1196000,
        "originalPrice": 1800000,
        "duration": "Theo Gói",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành code kích hoạt",
        "benefits": [
          "3 Triệu ký tự / Credits"
        ],
        "usageConditions": [
          "Nhập mã redeem"
        ],
        "stock": 10
      },
      {
        "sku": "ELEVENLABS-REDEEM-7M",
        "name": "ElevenLabs Redeem 7M Credit",
        "price": 2279000,
        "originalPrice": 3400000,
        "duration": "Theo Gói",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành code kích hoạt",
        "benefits": [
          "7 Triệu ký tự tối đa"
        ],
        "usageConditions": [
          "Nhập mã redeem"
        ],
        "stock": 8
      }
    ]
  },
  {
    "slug": "spotify",
    "name": "Spotify",
    "category": "Âm Nhạc & Giải Trí",
    "badgeLabel": "Âm Nhạc 320kbps",
    "shortDesc": "Kho nhạc trực tuyến bản quyền, nghe offline không giới hạn không quảng cáo.",
    "fullDesc": "Spotify Premium nâng cấp chính chủ hoặc gia đình bảo hành toàn thời gian.",
    "iconPath": "/assets/icons/products/spotify.jpg",
    "gradient": "from-emerald-500 to-green-700",
    "brandColor": "#1DB954",
    "packages": [
      {
        "sku": "SPOTIFY-PREM-1M",
        "name": "Spotify 1 Months",
        "price": 15000,
        "originalPrice": 59000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "Không quảng cáo",
          "Tải nhạc offline 320kbps",
          "Chuyển bài không giới hạn"
        ],
        "usageConditions": [
          "Email cá nhân chính chủ"
        ],
        "stock": 50
      },
      {
        "sku": "SPOTIFY-PREM-3M",
        "name": "Spotify 3 Months",
        "price": 35000,
        "originalPrice": 177000,
        "duration": "3 Tháng",
        "durationDays": 90,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 3 tháng",
        "benefits": [
          "Nghe nhạc liên tục 3 tháng",
          "Tiết kiệm chi phí"
        ],
        "usageConditions": [
          "Email cá nhân"
        ],
        "stock": 40
      },
      {
        "sku": "SPOTIFY-PREM-6M",
        "name": "Spotify 6 Months",
        "price": 75000,
        "originalPrice": 354000,
        "duration": "6 Tháng",
        "durationDays": 180,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 6 tháng",
        "benefits": [
          "Gói nửa năm tiện lợi",
          "Hỗ trợ đổi slot nhanh chóng"
        ],
        "usageConditions": [
          "Email cá nhân"
        ],
        "stock": 35
      },
      {
        "sku": "SPOTIFY-PREM-12M",
        "name": "Spotify 12 Months",
        "price": 135000,
        "originalPrice": 708000,
        "duration": "12 Tháng",
        "durationDays": 365,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 365 ngày",
        "benefits": [
          "Gói 1 năm trọn vẹn",
          "Tiết kiệm 80% so với giá gốc"
        ],
        "usageConditions": [
          "Email cá nhân"
        ],
        "stock": 30
      }
    ]
  },
  {
    "slug": "locketgold",
    "name": "Locket Gold (iOS)",
    "category": "Mạng Xã Hội & Đời Sống",
    "badgeLabel": "Widget iOS",
    "shortDesc": "Chia sẻ ảnh widget màn hình chính cùng người thương và bạn bè thân thiết.",
    "fullDesc": "Locket Gold mở khóa toàn bộ tính năng VIP, biểu tượng icon app độc quyền.",
    "iconPath": "/assets/icons/products/locketgold.jpg",
    "gradient": "from-amber-500 to-yellow-600",
    "brandColor": "#F59E0B",
    "packages": [
      {
        "sku": "LOCKET-GOLD-BHF-1M",
        "name": "[BHF] Locket Gold 1 Months",
        "price": 35000,
        "originalPrice": 89000,
        "duration": "1 Tháng",
        "durationDays": 30,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 tháng",
        "benefits": [
          "Đổi icon ứng dụng độc quyền",
          "Đăng tải video dài hơn",
          "Huy hiệu vàng danh giá"
        ],
        "usageConditions": [
          "Apple ID / Số điện thoại đăng ký Locket"
        ],
        "stock": 40
      },
      {
        "sku": "LOCKET-GOLD-BHF-1Y",
        "name": "[BHF] Locket Gold 1 Years",
        "price": 45000,
        "originalPrice": 299000,
        "duration": "1 Năm",
        "durationDays": 365,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành full 1 năm",
        "benefits": [
          "Trải nghiệm 1 năm giá siêu ưu đãi",
          "Tất cả đặc quyền Gold"
        ],
        "usageConditions": [
          "Tài khoản Locket"
        ],
        "stock": 35
      },
      {
        "sku": "LOCKET-GOLD-BHF-LIFETIME",
        "name": "[BHF] Locket Gold 1 Lifetimes",
        "price": 85000,
        "originalPrice": 599000,
        "duration": "Vĩnh Viễn",
        "durationDays": null,
        "status": "ACTIVE",
        "fulfillmentMode": "MANUAL",
        "warranty": "Bảo hành trọn đời tài khoản",
        "benefits": [
          "Sử dụng vĩnh viễn không lo gia hạn",
          "Tiết kiệm tối đa"
        ],
        "usageConditions": [
          "Tài khoản Locket"
        ],
        "stock": 30
      }
    ]
  },
  {
    "slug": "api-tool-sms",
    "name": "API Tool SMS",
    "category": "Dịch Vụ SMS & OTP",
    "badgeLabel": "Sản Phẩm Độc Lập",
    "shortDesc": "Gói API Tool SMS 30 Ngày tốc độ cao, tích hợp dễ dàng và ổn định.",
    "fullDesc": "Cung cấp gói API Tool SMS (30 Ngày), tài liệu kết nối, key xác thực và hỗ trợ cài đặt trực tiếp từ Admin.",
    "iconPath": "/assets/icons/api/sms-tool.svg",
    "gradient": "from-sky-600 to-blue-800",
    "brandColor": "#0284C7",
    "packages": [
      {
        "sku": "API-TOOL-SMS-120K",
        "name": "API Tool SMS (30 Ngày)",
        "price": 120000,
        "originalPrice": 250000,
        "duration": "30 Ngày",
        "durationDays": 30,
        "status": "ACTIVE",
        "allow_voucher": false,
        "allowVoucher": false,
        "fulfillmentMode": "MANUAL",
        "fulfillment_mode": "MANUAL",
        "input_type": "admin_deliver",
        "delivery_mode": "admin_deliver",
        "custom_input_label": "Telegram / Zalo nhận bộ Key & Hướng dẫn API",
        "sort_order": 4,
        "warranty": "Bảo hành & hỗ trợ kỹ thuật 30 Ngày",
        "warranty_days": 30,
        "warrantyDays": 30,
        "description": "Gói API Tool SMS (30 Ngày). Không áp dụng mã giảm giá. Admin tạo & bàn giao Key + Bộ cài đặt kết nối.",
        "benefits": [
          "Cổng API Tool SMS ổn định trong 30 Ngày",
          "Tài liệu tích hợp và Key xác thực an toàn",
          "Admin tạo & bàn giao trực tiếp qua đơn hàng"
        ],
        "usageConditions": [
          "Sản phẩm API không áp dụng mã giảm giá"
        ],
        "stock": 100
      }
    ]
  }
];
