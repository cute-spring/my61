// DiagramRenderer abstraction
export interface DiagramRenderResult {
  svg: string;
  engine: string;
  durationMs: number;
  fromCache?: boolean;
}
export interface DiagramRenderer {
  engine(): string;
  render(code: string): Promise<DiagramRenderResult>;
}
