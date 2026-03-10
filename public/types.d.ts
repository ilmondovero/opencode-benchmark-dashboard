declare class Chart {
  constructor(ctx: HTMLCanvasElement, config: unknown);
  destroy(): void;
  draw(): void;
  ctx: CanvasRenderingContext2D;
  data: {
    datasets: {
      data: unknown[];
    }[];
  };
  scales: {
    x: { getPixelForValue(value: number): number };
    y: { getPixelForValue(value: number): number };
  };
  static register(plugin: unknown): void;
  options: {
    onClick?: (event: unknown, elements: { index: number }[]) => void;
    plugins?: {
      title?: { display: boolean; text: string[] };
      tooltip?: { callbacks?: { label: (ctx: unknown) => string } };
    };
  };
}

declare function roundRect(x: number, y: number, w: number, h: number, r: number): void;

interface Window {
  modelData: Record<string, ModelData>;
  models: string[];
  testCases: string[];
}
