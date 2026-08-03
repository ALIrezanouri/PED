interface PlotlyStatic {
  react: (
    el: HTMLElement,
    data: unknown[],
    layout?: unknown,
    config?: unknown,
  ) => Promise<void>;
  purge: (el: HTMLElement) => void;
  Plots: { resize: (el: HTMLElement) => void };
}

interface Window {
  Plotly?: PlotlyStatic;
}
