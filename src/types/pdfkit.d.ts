declare module "pdfkit" {
  interface PDFDocumentOptions {
    size?: string | [number, number];
    layout?: "portrait" | "landscape";
    margins?: { top: number; bottom: number; left: number; right: number };
    info?: Record<string, any>;
    [key: string]: any;
  }

  class PDFDocument {
    constructor(options?: PDFDocumentOptions);
    fontSize(size: number): this;
    font(name: string): this;
    text(text: string, options?: Record<string, any>): this;
    text(text: string, x: number, y: number, options?: Record<string, any>): this;
    moveDown(lines?: number): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    stroke(color?: string): this;
    image(data: Buffer | string, x: number, y: number, options?: Record<string, any>): this;
    addPage(): this;
    end(): void;
    pipe(dest: any): this;
    on(event: string, callback: (...args: any[]) => void): this;
    page: { width: number; height: number; margins: { top: number; bottom: number; left: number; right: number } };
    y: number;
    x: number;
  }

  export default PDFDocument;
}
