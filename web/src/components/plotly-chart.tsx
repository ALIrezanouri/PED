"use client";

import { useEffect, useRef } from "react";

type PlotlyChartProps = {
  data: unknown[];
  layout?: Record<string, unknown>;
  className?: string;
  height?: number;
};

/**
 * Thin wrapper around the global Plotly (loaded from CDN in layout.tsx).
 * Re-renders whenever data/layout change and cleans up on unmount.
 */
export function PlotlyChart({ data, layout, className, height = 380 }: PlotlyChartProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    const draw = () => {
      if (cancelled || !el) return;
      const Plotly = window.Plotly;
      if (!Plotly) {
        // Plotly script not ready yet; retry shortly.
        window.setTimeout(draw, 120);
        return;
      }
      const baseLayout = {
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { family: "Vazirmatn, system-ui, sans-serif", color: "#cbd5e1", size: 12 },
        margin: { l: 60, r: 30, t: 24, b: 50 },
        height,
        ...layout,
      };
      Plotly.react(el, data, baseLayout, { responsive: true, displayModeBar: false });
    };
    draw();

    return () => {
      cancelled = true;
      if (el && window.Plotly) window.Plotly.purge(el);
    };
  }, [data, layout, height]);

  return <div ref={ref} className={className} style={{ width: "100%", height }} />;
}
