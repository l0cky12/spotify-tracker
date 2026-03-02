"use client";

import { useSyncExternalStore } from "react";
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
  value: number;
};

export function TrendChart({ points }: { points: Point[] }) {
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const chartData = points.map((p) => ({
    date: new Date(p.capturedAt).toLocaleDateString(),
    value: p.value,
  }));

  if (!isClient) {
    return <div className="h-28 w-full rounded-md bg-[var(--panel-soft)]/60" />;
  }

  return (
    <div className="h-28 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={112}>
        <LineChart data={chartData}>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
