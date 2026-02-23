import { NextRequest, NextResponse } from "next/server";
import { formatDdMmYy } from "@/lib/date/formatDdMmYy";
import {
  convertImageToPdf,
  PdfTooLargeError,
} from "@/lib/pdf/convertImageToPdf";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const dateValue = formData.get("date");
    const reduceResolutionValue = formData.get("reduceResolution");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "File tidak ditemukan." },
        { status: 400 }
      );
    }

    const mimeType = file.type;

    if (!["image/jpeg", "image/png"].includes(mimeType)) {
      return NextResponse.json(
        { error: "Hanya mendukung gambar JPG atau PNG." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const allowLowerResolution = reduceResolutionValue === "true";

    const pdfBytes = await convertImageToPdf(buffer, mimeType, {
      allowLowerResolution,
    });

    let dateForFilename = new Date();

    if (typeof dateValue === "string" && dateValue) {
      const parts = dateValue.split("-");
      if (parts.length === 3) {
        const year = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const day = Number(parts[2]);
        const parsed = new Date(year, month, day);
        if (!isNaN(parsed.getTime())) {
          dateForFilename = parsed;
        }
      }
    }

    const filename = `${formatDdMmYy(dateForFilename)}.pdf`;

    const pdfUint8 = new Uint8Array(pdfBytes);

    return new Response(pdfUint8.buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error(error);

    if (error instanceof PdfTooLargeError) {
      const sizeMb = (error.sizeBytes / (1024 * 1024)).toFixed(2);
      const errorCode = error.allowLowerResolutionAttempt
        ? "PDF_TOO_LARGE_FINAL"
        : "PDF_TOO_LARGE_INITIAL";

      return NextResponse.json(
        {
          error:
            "Hasil file PDF melebihi batas ukuran 1 MB.",
          errorCode,
          sizeMb,
        },
        { status: 413 }
      );
    }

    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengonversi file." },
      { status: 500 }
    );
  }
}
