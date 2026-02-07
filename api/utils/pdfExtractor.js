import { PDFParse } from "pdf-parse";

export async function extractPdfText(buffer, maxPages = 50) {
  const parser = new PDFParse({ data: buffer }); // buffer from multer

  const result = await parser.getText();

  if (result.numpages > maxPages) {
    throw new Error(`PDF too large. Max allowed pages is ${maxPages}`);
  }

  await parser.destroy(); // free memory

  return result.text;
}
