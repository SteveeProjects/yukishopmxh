// ==============================================================================
// YUKISHOPMXH — DANH SÁCH 40+ NGÂN HÀNG & VÍ ĐIỆN TỬ VIỆT NAM (NAPAS 24/7)
// Phí rút: Ví điện tử / yêu cầu QR bắt buộc = 5.000đ; Ngân hàng số/thường = 2.000đ
// ==============================================================================

export interface VietnamBank {
  code: string;
  shortName: string;
  name: string;
  bin?: string;
  isEWallet?: boolean;
  isQrMandatory?: boolean;
  withdrawalFee: number; // 2000 hoặc 5000
}

export const VIETNAM_BANKS: VietnamBank[] = [
  // --- VÍ ĐIỆN TỬ & CỔNG THANH TOÁN (PHÍ 5.000đ / BẮT BUỘC QR HOẶC SỐ VÍ) ---
  {
    code: 'MOMO',
    shortName: 'Ví MoMo',
    name: 'Ví Điện Tử MoMo (Khuyên dùng mã QR nhận tiền)',
    isEWallet: true,
    isQrMandatory: true,
    withdrawalFee: 5000,
  },
  {
    code: 'ZALOPAY',
    shortName: 'Ví ZaloPay',
    name: 'Ví Điện Tử ZaloPay (Khuyên dùng mã QR nhận tiền)',
    isEWallet: true,
    isQrMandatory: true,
    withdrawalFee: 5000,
  },
  {
    code: 'VTMONEY',
    shortName: 'Viettel Money',
    name: 'Viettel Money (ViettelPay)',
    isEWallet: true,
    isQrMandatory: false,
    withdrawalFee: 5000,
  },
  {
    code: 'SHOPEEPAY',
    shortName: 'ShopeePay',
    name: 'Ví Điện Tử ShopeePay',
    isEWallet: true,
    isQrMandatory: false,
    withdrawalFee: 5000,
  },
  {
    code: 'VNPTPAY',
    shortName: 'VNPT Money',
    name: 'VNPT Money (VNPT Pay)',
    isEWallet: true,
    isQrMandatory: false,
    withdrawalFee: 5000,
  },

  // --- TOP NGÂN HÀNG LỚN (NAPAS 24/7 - PHÍ 2.000đ) ---
  {
    code: 'VCB',
    shortName: 'Vietcombank',
    name: 'Ngân hàng Ngoại Thương Việt Nam (Vietcombank)',
    bin: '970436',
    withdrawalFee: 2000,
  },
  {
    code: 'MB',
    shortName: 'MB Bank',
    name: 'Ngân hàng Quân Đội (MB)',
    bin: '970422',
    withdrawalFee: 2000,
  },
  {
    code: 'TCB',
    shortName: 'Techcombank',
    name: 'Ngân hàng Kỹ Thương (Techcombank)',
    bin: '970407',
    withdrawalFee: 2000,
  },
  {
    code: 'ACB',
    shortName: 'ACB',
    name: 'Ngân hàng Á Châu (ACB)',
    bin: '970416',
    withdrawalFee: 2000,
  },
  {
    code: 'VPB',
    shortName: 'VPBank',
    name: 'Ngân hàng Việt Nam Thịnh Vượng (VPBank)',
    bin: '970432',
    withdrawalFee: 2000,
  },
  {
    code: 'TPB',
    shortName: 'TPBank',
    name: 'Ngân hàng Tiên Phong (TPBank)',
    bin: '970423',
    withdrawalFee: 2000,
  },
  {
    code: 'CTG',
    shortName: 'VietinBank',
    name: 'Ngân hàng Công Thương Việt Nam (VietinBank)',
    bin: '970415',
    withdrawalFee: 2000,
  },
  {
    code: 'BIDV',
    shortName: 'BIDV',
    name: 'Ngân hàng Đầu tư và Phát triển Việt Nam (BIDV)',
    bin: '970418',
    withdrawalFee: 2000,
  },
  {
    code: 'VBA',
    shortName: 'Agribank',
    name: 'Ngân hàng Nông nghiệp & Phát triển Nông thôn (Agribank)',
    bin: '970405',
    withdrawalFee: 2000,
  },
  {
    code: 'STB',
    shortName: 'Sacombank',
    name: 'Ngân hàng Sài Gòn Thương Tín (Sacombank)',
    bin: '970403',
    withdrawalFee: 2000,
  },
  {
    code: 'HDB',
    shortName: 'HDBank',
    name: 'Ngân hàng Phát triển TP.HCM (HDBank)',
    bin: '970437',
    withdrawalFee: 2000,
  },
  {
    code: 'VIB',
    shortName: 'VIB',
    name: 'Ngân hàng Quốc Tế (VIB)',
    bin: '970441',
    withdrawalFee: 2000,
  },
  {
    code: 'SHB',
    shortName: 'SHB',
    name: 'Ngân hàng Sài Gòn - Hà Nội (SHB)',
    bin: '970443',
    withdrawalFee: 2000,
  },
  {
    code: 'MSB',
    shortName: 'MSB',
    name: 'Ngân hàng Hàng Hải (MSB)',
    bin: '970426',
    withdrawalFee: 2000,
  },
  {
    code: 'OCB',
    shortName: 'OCB',
    name: 'Ngân hàng Phương Đông (OCB)',
    bin: '970448',
    withdrawalFee: 2000,
  },
  {
    code: 'LPB',
    shortName: 'LPBank',
    name: 'Ngân hàng Bưu điện Liên Việt (LPBank)',
    bin: '970449',
    withdrawalFee: 2000,
  },
  {
    code: 'SEAB',
    shortName: 'SeABank',
    name: 'Ngân hàng Đông Nam Á (SeABank)',
    bin: '970440',
    withdrawalFee: 2000,
  },
  {
    code: 'EIB',
    shortName: 'Eximbank',
    name: 'Ngân hàng Xuất Nhập Khẩu (Eximbank)',
    bin: '970431',
    withdrawalFee: 2000,
  },
  {
    code: 'BAB',
    shortName: 'Bac A Bank',
    name: 'Ngân hàng Bắc Á (Bac A Bank)',
    bin: '970409',
    withdrawalFee: 2000,
  },
  {
    code: 'NAB',
    shortName: 'Nam A Bank',
    name: 'Ngân hàng Nam Á (Nam A Bank)',
    bin: '970428',
    withdrawalFee: 2000,
  },
  {
    code: 'KLB',
    shortName: 'Kienlongbank',
    name: 'Ngân hàng Kiên Long (Kienlongbank)',
    bin: '970452',
    withdrawalFee: 2000,
  },
  {
    code: 'BVB',
    shortName: 'BVBank',
    name: 'Ngân hàng Bản Việt (BVBank)',
    bin: '970454',
    withdrawalFee: 2000,
  },
  {
    code: 'PVCB',
    shortName: 'PVcomBank',
    name: 'Ngân hàng Đại Chúng Việt Nam (PVcomBank)',
    bin: '970412',
    withdrawalFee: 2000,
  },
  {
    code: 'PGB',
    shortName: 'PGBank',
    name: 'Ngân hàng Thịnh vượng và Phát triển (PGBank)',
    bin: '970430',
    withdrawalFee: 2000,
  },
  {
    code: 'VIETBANK',
    shortName: 'VietBank',
    name: 'Ngân hàng Việt Nam Thương Tín (VietBank)',
    bin: '970433',
    withdrawalFee: 2000,
  },
  {
    code: 'BAOVIET',
    shortName: 'BaoViet Bank',
    name: 'Ngân hàng Bảo Việt (BaoViet Bank)',
    bin: '970438',
    withdrawalFee: 2000,
  },
  {
    code: 'SAIGONBANK',
    shortName: 'Saigonbank',
    name: 'Ngân hàng Sài Gòn Công Thương (Saigonbank)',
    bin: '970400',
    withdrawalFee: 2000,
  },
  {
    code: 'TIMO',
    shortName: 'Timo',
    name: 'Ngân hàng số Timo by BVBank',
    bin: '963388',
    withdrawalFee: 2000,
  },
  {
    code: 'CAKE',
    shortName: 'Cake by VPBank',
    name: 'Ngân hàng số Cake by VPBank',
    bin: '546034',
    withdrawalFee: 2000,
  },
  {
    code: 'KBANK',
    shortName: 'KBank Vietnam',
    name: 'Ngân hàng Kasikornbank (KBank Chi nhánh VN)',
    bin: '668888',
    withdrawalFee: 2000,
  },
  {
    code: 'SHINHAN',
    shortName: 'Shinhan Bank',
    name: 'Ngân hàng Shinhan Việt Nam',
    bin: '970424',
    withdrawalFee: 2000,
  },
  {
    code: 'WOORI',
    shortName: 'Woori Bank',
    name: 'Ngân hàng Woori Việt Nam',
    bin: '970457',
    withdrawalFee: 2000,
  },
  {
    code: 'CIMB',
    shortName: 'CIMB Bank',
    name: 'Ngân hàng CIMB Việt Nam',
    bin: '422589',
    withdrawalFee: 2000,
  },
  {
    code: 'PUBLICBANK',
    shortName: 'Public Bank',
    name: 'Ngân hàng Public Bank Việt Nam',
    bin: '970439',
    withdrawalFee: 2000,
  },
  {
    code: 'HSBC',
    shortName: 'HSBC',
    name: 'Ngân hàng HSBC Việt Nam',
    bin: '445094',
    withdrawalFee: 2000,
  },
  {
    code: 'SCVN',
    shortName: 'Standard Chartered',
    name: 'Ngân hàng Standard Chartered Việt Nam',
    bin: '970410',
    withdrawalFee: 2000,
  },
];

/**
 * Tra cứu thông tin ngân hàng theo mã code hoặc shortName
 */
export function findBankByCode(codeOrName: string): VietnamBank | undefined {
  const norm = String(codeOrName || '').trim().toUpperCase();
  if (!norm) return undefined;
  return VIETNAM_BANKS.find(
    (b) => b.code.toUpperCase() === norm || b.shortName.toUpperCase() === norm
  );
}

/**
 * Tính phí rút tiền theo ngân hàng/ví:
 * - MoMo / ZaloPay / Ví điện tử / QR: 5.000đ
 * - Ngân hàng Napas thường: 2.000đ
 */
export function calculateWithdrawalFee(bankCode: string, hasCustomQr = false): number {
  const bank = findBankByCode(bankCode);
  if (bank) {
    if (bank.withdrawalFee) return bank.withdrawalFee;
    if (bank.isEWallet || bank.isQrMandatory) return 5000;
  }
  if (hasCustomQr) return 5000;
  return 2000;
}

/**
 * Chuẩn hóa tên chủ tài khoản sang CHỮ IN HOA KHÔNG DẤU
 * Ví dụ: "Nguyễn Văn A" -> "NGUYEN VAN A"
 */
export function normalizeAccountHolderName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
