'use client';

import React, { useState } from 'react';
import { Upload, Link2, Sparkles, Image as ImageIcon, X } from 'lucide-react';

interface IconUploaderFieldProps {
  value: string;
  onChange: (newIcon: string) => void;
  className?: string;
}

export const PRESET_TECH_ICONS = [
  { name: 'DeepSeek', path: '/assets/icons/products/deepseek.jpg' },
  { name: 'ChatGPT', path: '/assets/icons/products/chatgpt.jpg' },
  { name: 'Claude', path: '/assets/icons/products/claude.jpg' },
  { name: 'Gemini', path: '/assets/icons/products/gemini.jpg' },
  { name: 'Grok', path: '/assets/icons/products/grok.jpg' },
  { name: 'YouTube', path: '/assets/icons/products/youtube.jpg' },
  { name: 'Canva', path: '/assets/icons/products/canva.jpg' },
  { name: 'CapCut', path: '/assets/icons/products/capcut.jpg' },
  { name: 'Netflix', path: '/assets/icons/products/netflix.jpg' },
  { name: 'Spotify', path: '/assets/icons/products/spotify.jpg' },
  { name: 'Duolingo', path: '/assets/icons/products/duolingo.jpg' },
  { name: 'Kling AI', path: '/assets/icons/products/klingai.jpg' },
  { name: 'Higgsfield', path: '/assets/icons/products/higgsfield.jpg' },
  { name: 'MiniMax', path: '/assets/icons/products/minimax.jpg' },
  { name: 'ElevenLabs', path: '/assets/icons/products/elevenlabs.jpg' },
  { name: 'Locket', path: '/assets/icons/products/locket.jpg' },
  { name: 'VPN', path: '/assets/icons/products/vpn.jpg' },
];

export function IconUploaderField({ value, onChange, className = '' }: IconUploaderFieldProps) {
  const [mode, setMode] = useState<'PRESET' | 'UPLOAD' | 'URL'>('PRESET');
  const [urlInput, setUrlInput] = useState('');
  const [compressing, setCompressing] = useState(false);

  // Handle local file upload with canvas compression
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh hợp lệ (.png, .jpg, .webp, .svg)');
      return;
    }

    setCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress to max 256x256
        const canvas = document.createElement('canvas');
        const maxSize = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/webp', 0.85);
          onChange(dataUrl);
        } else {
          onChange(String(event.target?.result || ''));
        }
        setCompressing(false);
      };
      img.src = String(event.target?.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onChange(urlInput.trim());
    }
  };

  const displayIcon = value || '/assets/icons/products/chatgpt.jpg';

  return (
    <div className={`space-y-2.5 ${className}`}>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
        Icon / Ảnh Đại Diện Dịch Vụ
      </label>

      {/* Preview Card */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
        <div className="relative">
          <div className="icon-beam-box icon-ambient-live active w-14 h-14 rounded-2xl overflow-hidden border border-cyan-500/40 bg-slate-900 shadow-md flex items-center justify-center shrink-0">
            <img
              src={displayIcon}
              alt="Icon Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/icons/products/chatgpt.jpg';
              }}
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Khung Xem Trước (Preview)</span>
          </div>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">
            {value.startsWith('data:')
              ? 'Ảnh upload tải từ thiết bị (Data URL nén)'
              : value || 'Mặc định: /assets/icons/products/chatgpt.jpg'}
          </p>
        </div>

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title="Xóa icon đã chọn"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
        <button
          type="button"
          onClick={() => setMode('PRESET')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] transition flex items-center justify-center gap-1.5 ${
            mode === 'PRESET'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Thư Viện Có Sẵn</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('UPLOAD')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] transition flex items-center justify-center gap-1.5 ${
            mode === 'UPLOAD'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Tải Ảnh Lên</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('URL')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] transition flex items-center justify-center gap-1.5 ${
            mode === 'URL'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Dán Link URL</span>
        </button>
      </div>

      {/* Mode 1: Presets Grid */}
      {mode === 'PRESET' && (
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 max-h-40 overflow-y-auto">
          {PRESET_TECH_ICONS.map((icon) => (
            <button
              key={icon.name}
              type="button"
              onClick={() => onChange(icon.path)}
              className={`p-1 rounded-xl border transition flex flex-col items-center gap-1 group ${
                value === icon.path
                  ? 'border-cyan-400 bg-cyan-950/50 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center">
                <img src={icon.path} alt={icon.name} className="w-full h-full object-cover group-hover:scale-110 transition" />
              </div>
              <span className="text-[9px] text-slate-300 font-semibold truncate w-full text-center">
                {icon.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Mode 2: Upload File */}
      {mode === 'UPLOAD' && (
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-700 text-center space-y-2">
          <Upload className="w-6 h-6 text-cyan-400 mx-auto" />
          <div className="text-xs text-slate-300 font-bold">
            {compressing ? 'Đang nén và xử lý ảnh...' : 'Chọn file ảnh từ điện thoại hoặc máy tính'}
          </div>
          <p className="text-[10px] text-slate-400">
            Hỗ trợ định dạng .PNG, .JPG, .WEBP, .SVG (Tự động nén chuẩn WebP)
          </p>
          <input
            type="file"
            accept="image/*"
            disabled={compressing}
            onChange={handleFileUpload}
            className="block w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cyan-500 file:text-slate-950 hover:file:opacity-90 cursor-pointer"
          />
        </div>
      )}

      {/* Mode 3: Paste URL */}
      {mode === 'URL' && (
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Dán link ảnh (https://... hoặc /assets/...)"
            className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
          >
            Áp Dụng
          </button>
        </div>
      )}
    </div>
  );
}
