declare module "pdfmake" {
  import { TDocumentDefinitions } from "pdfmake/interfaces";
  export default class PdfPrinter {
    constructor(fonts: Record<string, any>);
    createPdfKitDocument(docDef: TDocumentDefinitions): any;
  }
}

declare module "pdfmake/interfaces" {
  export type Content = any;
  export type TableCell = any;
  export type ImageDefinition = any;

  export interface TDocumentDefinitions {
    pageSize?: string;
    pageMargins?: [number, number, number, number];
    pageOrientation?: "portrait" | "landscape";
    content: Content[];
    styles?: Record<string, any>;
    defaultStyle?: Record<string, any>;
    info?: Record<string, any>;
    [key: string]: any;
  }
}
