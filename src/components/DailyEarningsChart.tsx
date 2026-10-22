import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp, Calendar, Droplets } from 'lucide-react';
import { DailyEarning } from '../types';

interface DailyEarningsChartProps {
  data: DailyEarning[];
  timeframe?: string;
  totalEarnings?: number;
}

export const DailyEarningsChart: React.FC<DailyEarningsChartProps> = ({
  data,
  timeframe = 'Last 14 Days',
  totalEarnings = 0,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Droplets className="w-4 h-4" />
            Performance & Water Telemetry
          </div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            Daily Water Earnings
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-medium">
              {timeframe}
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Total Rewards Yield</div>
            <div className="text-lg font-bold text-cyan-300 font-mono">
              UGX {totalEarnings.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="earningsArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const val = payload[0].value as number;
                  const item = payload[0].payload as DailyEarning;
                  return (
                    <div className="bg-slate-950/95 border border-cyan-500/30 rounded-xl p-3.5 shadow-2xl backdrop-blur-md">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{item.date || label}</span>
                      </div>
                      <div className="text-sm font-semibold text-white">Daily Yield:</div>
                      <div className="text-base font-bold text-cyan-300 font-mono">
                        UGX {val.toLocaleString()}
                      </div>
                      {item.machineCount !== undefined && (
                        <div className="text-[11px] text-slate-400 mt-1">
                          Active Units: <span className="text-white font-medium">{item.machineCount}</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="earnings"
              stroke="#22d3ee"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#earningsArea)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Real-time water production flow & telemetry rewarded every 24h
        </span>
        <span className="text-slate-500">Auto-credited to wallet balance</span>
      </div>
    </div>
  );
};
