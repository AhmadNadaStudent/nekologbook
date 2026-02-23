import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

const MAX_PDF_SIZE_BYTES = 1_000_000; // 1 MB
const DEFAULT_MIN_LONG_EDGE = 1080; // minimal target panjang sisi dalam piksel
const MIN_LONG_EDGE_WHEN_REDUCED = 600; // batas bawah saat menurunkan resolusi

export class PdfTooLargeError extends Error {
  sizeBytes: number;
  allowLowerResolutionAttempt: boolean;

  constructor(sizeBytes: number, allowLowerResolutionAttempt: boolean) {
    super("PDF lebih besar dari batas yang diizinkan.");
    this.name = "PdfTooLargeError";
    this.sizeBytes = sizeBytes;
    this.allowLowerResolutionAttempt = allowLowerResolutionAttempt;
  }
}

type ConvertOptions = {
  allowLowerResolution?: boolean;
  minLongEdge?: number;
  maxPdfSizeBytes?: number;
};

export async function convertImageToPdf(
  imageBuffer: Buffer,
  mimeType: string,
  options: ConvertOptions = {}
): Promise<Uint8Array> {
  const allowLowerResolution = options.allowLowerResolution ?? false;
  const minLongEdge = options.minLongEdge ?? DEFAULT_MIN_LONG_EDGE;
  const maxPdfSizeBytes = options.maxPdfSizeBytes ?? MAX_PDF_SIZE_BYTES;

  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Tidak dapat membaca dimensi gambar.");
  }

  const originalWidth = metadata.width;
  const originalHeight = metadata.height;
  const isLandscape = originalWidth >= originalHeight;

  let currentLongEdge = Math.max(originalWidth, originalHeight);
  const targetMinLongEdge = minLongEdge;
  const minAllowedLongEdge = allowLowerResolution
    ? MIN_LONG_EDGE_WHEN_REDUCED
    : targetMinLongEdge;

  // Untuk percobaan pertama, standar-kan ke minimal 1080p (atau minLongEdge)
  if (currentLongEdge < targetMinLongEdge && !allowLowerResolution) {
    currentLongEdge = targetMinLongEdge;
  } else if (currentLongEdge > targetMinLongEdge) {
    currentLongEdge = targetMinLongEdge;
  }

  const qualitySteps = allowLowerResolution ? [80, 60, 40, 30] : [80, 60, 40];
  let lastPdfSize = 0;

  // Coba beberapa kombinasi resolusi + kualitas sampai ukuran PDF <= batas
  while (true) {
    for (const quality of qualitySteps) {
      const resizeOptions = {
        width: isLandscape ? currentLongEdge : undefined,
        height: !isLandscape ? currentLongEdge : undefined,
        fit: "inside" as const,
      };

      let pipeline = sharp(imageBuffer).resize(resizeOptions);

      // Konversi ke JPEG untuk efisiensi ukuran; abaikan tipe asli.
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });

      const optimizedBuffer = await pipeline.toBuffer();

      const pdfDoc = await PDFDocument.create();
      const embeddedImage = await pdfDoc.embedJpg(optimizedBuffer);

      const { width, height } = embeddedImage;
      const page = pdfDoc.addPage([width, height]);

      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width,
        height,
      });

      const pdfBytes = await pdfDoc.save();
      lastPdfSize = pdfBytes.length;

      if (pdfBytes.length <= maxPdfSizeBytes) {
        return pdfBytes;
      }
    }

    // Jika semua kualitas sudah dicoba di resolusi ini dan masih terlalu besar,
    // turunkan resolusi jika diizinkan.
    if (!allowLowerResolution || currentLongEdge <= minAllowedLongEdge) {
      throw new PdfTooLargeError(lastPdfSize, allowLowerResolution);
    }

    currentLongEdge = Math.floor(currentLongEdge * 0.8);
  }
}
