declare module "pdf-parse" {
  type PdfParseResult = {
    numpages?: number;
    numrender?: number;
    info?: unknown;
    metadata?: unknown;
    version?: string;
    text?: string;
  };

  type PdfParse = (dataBuffer: Buffer | Uint8Array, options?: unknown) => Promise<PdfParseResult>;

  const pdfParse: PdfParse;
  export default pdfParse;
}

