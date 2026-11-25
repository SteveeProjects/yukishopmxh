'use client';

import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  amount: number;
  type: 'BUY' | 'BUFF' | 'TOPUP';
}

export function ActivityTicker() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    fetch('/api/activity')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.activities)) {
          setActivities(data.activities);
        }
      })
      .catch(() => {});
  }, []);

  if (activities.length === 0) {
    return null;
  }

  const tickerItems = activities.length > 2 ? [...activities, ...activities] : activities;

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN').format(num) + 'đ';

  return (
    <div className="w-full overflow-hidden rounded-2xl bg-[#0D1526]/85 border border-sky-400/15 py-2.5 px-3.5 select-none backdrop-blur-xl shadow-lg group">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-500/10 border border-sky-400/25 text-sky-300 font-bold text-[11px] shrink-0 whitespace-nowrap">
          <Activity className="w-3.5 h-3.5 text-sky-400" strokeWidth={1.75} />
          <span>Giao dịch gần đây</span>
        </div>

        <div className="overflow-hidden relative w-full mask-linear-fade">
          <div
            className={`flex items-center gap-8 whitespace-nowrap ${
              activities.length > 2 ? 'animate-ticker group-hover:[animation-play-state:paused]' : ''
            }`}
          >
            {tickerItems.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="inline-flex items-center gap-2 text-xs text-slate-300 font-medium shrink-0"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span>
                  {item.actor} vừa {item.action} <strong className="text-white font-semibold">{item.target}</strong>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md font-mono tabular-nums font-bold text-[10px] ${
                    item.type === 'TOPUP'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                      : 'bg-sky-500/15 text-sky-300 border border-sky-500/25'
                  }`}
                >
                  {item.type === 'TOPUP' ? '+' : ''}
                  {formatVND(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
