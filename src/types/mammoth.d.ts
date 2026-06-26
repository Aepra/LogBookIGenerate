declare module "mammoth" {
  export interface MammothResult {
    value: string;
    messages: MammothMessage[];
  }

  export interface MammothMessage {
    type: "warning" | "error";
    message: string;
  }

  export interface MammothOptions {
    styleMap?: string | string[];
    includeDefaultStyleMap?: boolean;
    convertImage?: MammothImageConverter;
  }

  export interface MammothImageConverter {
    (image: MammothImageElement): Promise<MammothImageResponse>;
  }

  export interface MammothImageElement {
    altText: string;
    contentType: string;
    read(): ArrayBuffer;
    readAsBase64String(): Promise<string>;
  }

  export interface MammothImageResponse {
    src: string;
  }

  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer } | { path: string },
    options?: MammothOptions
  ): Promise<MammothResult>;

  export function convertToMarkdown(
    input: { arrayBuffer: ArrayBuffer } | { path: string },
    options?: MammothOptions
  ): Promise<MammothResult>;

  export function extractRawText(
    input: { arrayBuffer: ArrayBuffer } | { path: string }
  ): Promise<MammothResult>;
}