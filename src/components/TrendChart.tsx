"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  capturedAt: string;
  rank: number;
};

export function TrendChart({ points }: { points: Point[] }) {
  const chartData = points.map((p) => ({
    date: new Date(p.capturedAt).toLocaleDateString(),
    rank: p.rank,
  }));

  return (
    <div className="h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis dataKey="date" hide />
          <YAxis reversed domain={[1, 50]} hide />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="rank"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
