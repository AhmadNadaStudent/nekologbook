"use client";

import { useState, FormEvent, ChangeEvent, DragEvent } from "react";
import exifr from "exifr";
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  TextField,
  Dialog,
} from "@mui/material";

type UploadItemStatus = "idle" | "converting" | "success" | "error";

type UploadItem = {
  id: string;
  file: File;
  previewUrl: string;
  originalSize: number;
  estimatedPdfSize: number;
  date: string;
  status: UploadItemStatus;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

const estimatePdfSize = (bytes: number): number => {
  // Perkiraan kasar: PDF hasil kompresi sekitar 60% dari ukuran gambar asli
  return Math.round(bytes * 0.6);
};

const getTodayAsInputDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateAsInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getExifDateAsInputValue = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateAsInputValue(value);
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateAsInputValue(parsed);
    }
  }

  return null;
};

const getDefaultDateForFile = async (file: File) => {
  try {
    const metadata = await exifr.parse(file, ["DateTimeOriginal"]);
    if (metadata && typeof metadata === "object") {
      const date = getExifDateAsInputValue(
        (metadata as { DateTimeOriginal?: unknown }).DateTimeOriginal
      );

      if (date) {
        return date;
      }
    }
  } catch {
    // Fallback ke tanggal hari ini kalau metadata tidak bisa dibaca.
  }

  return getTodayAsInputDate();
};

export function UploadForm() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewItem, setPreviewItem] = useState<UploadItem | null>(null);

  const handleDragEnter = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const currentTarget = event.currentTarget;
    const related = event.relatedTarget as Node | null;

    if (related && currentTarget.contains(related)) {
      return;
    }

    setIsDragging(false);
  };

  const addFiles = async (fileList: FileList | null) => {
    setError(null);
    setSuccess(null);

    if (!fileList || fileList.length === 0) {
      return;
    }

    const supportedTypes = ["image/jpeg", "image/png"];
    const validFiles: File[] = [];
    let hasInvalidType = false;

    Array.from(fileList).forEach((file) => {
      if (!supportedTypes.includes(file.type)) {
        hasInvalidType = true;
        return;
      }

      validFiles.push(file);
    });

    if (hasInvalidType) {
      setError("Hanya mendukung gambar JPG atau PNG.");
    }

    if (validFiles.length === 0) {
      return;
    }

    const newItems: UploadItem[] = await Promise.all(
      validFiles.map(async (file) => {
        const id = `${file.name}-${file.size}-${file.lastModified}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const previewUrl = URL.createObjectURL(file);
        const originalSize = file.size;
        const estimatedPdfSize = estimatePdfSize(originalSize);

        return {
          id,
          file,
          previewUrl,
          originalSize,
          estimatedPdfSize,
          date: await getDefaultDateForFile(file),
          status: "idle",
        };
      })
    );

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void addFiles(event.target.files);
    // reset supaya memilih file yang sama lagi tetap terdeteksi
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    void addFiles(event.dataTransfer?.files ?? null);
  };

  const handleItemDateChange = (id: string, value: string) => {
    setError(null);
    setSuccess(null);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              date: value,
            }
          : item
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((x) => x.id !== id);
    });
  };

  const downloadPdf = async (response: Response) => {
    const blob = await response.blob();

    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "converted.pdf";

    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";]+)"?/i);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (items.length === 0) {
      setError("Silakan pilih minimal satu file gambar terlebih dahulu.");
      return;
    }

    const missingDate = items.some((item) => !item.date);
    if (missingDate) {
      setError("Pastikan semua foto sudah memiliki tanggal kunjungan.");
      return;
    }

    const invalidType = items.some(
      (item) => !["image/jpeg", "image/png"].includes(item.file.type)
    );
    if (invalidType) {
      setError("Hanya mendukung gambar JPG atau PNG.");
      return;
    }

    const requestConversion = async (
      file: File,
      date: string,
      reduceResolution: boolean
    ): Promise<boolean> => {
      type ConversionErrorResponse = {
        error?: string;
        errorCode?: string;
        sizeMb?: string | number;
      };

      const formData = new FormData();
      formData.append("file", file);
      formData.append("date", date);
      if (reduceResolution) {
        formData.append("reduceResolution", "true");
      }

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        await downloadPdf(response);
        return true;
      }

      let data: ConversionErrorResponse | null = null;
      try {
        data = (await response.json()) as ConversionErrorResponse;
      } catch {
        setError("Gagal mengonversi gambar.");
        return false;
      }

      if (!reduceResolution && data?.errorCode === "PDF_TOO_LARGE_INITIAL") {
        const sizeMb = data.sizeMb ?? "?";
        const confirmMessage = `Hasil file terlalu besar (${sizeMb} MB). Turunkan resolusi?`;
        const shouldReduce = window.confirm(confirmMessage);

        if (shouldReduce) {
          return await requestConversion(file, date, true);
        }

        setError(data?.error || "Gagal mengonversi gambar.");
        return false;
      }

      if (reduceResolution && data?.errorCode === "PDF_TOO_LARGE_FINAL") {
        const sizeMb = data.sizeMb ?? "?";
        setError(
          `Tidak dapat membuat PDF di bawah 1 MB meskipun resolusi sudah diturunkan (ukuran saat ini ${sizeMb} MB).`
        );
        return false;
      }

      setError(data?.error || "Gagal mengonversi gambar.");
      return false;
    };

    try {
      setIsLoading(true);

      const results = await Promise.all(
        items.map(async (item) => {
          setItems((prev) =>
            prev.map((x) =>
              x.id === item.id
                ? {
                    ...x,
                    status: "converting",
                  }
                : x
            )
          );

          const ok = await requestConversion(item.file, item.date, false);

          setItems((prev) =>
            prev.map((x) =>
              x.id === item.id
                ? {
                    ...x,
                    status: ok ? "success" : "error",
                  }
                : x
            )
          );

          return ok;
        })
      );

      if (results.every((r) => r)) {
        setSuccess("Semua PDF berhasil dibuat, unduhan dimulai.");
      }
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan tak terduga. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper
      className="upload-form"
      elevation={6}
      sx={{
        width: "100%",
        minWidth: 1280,
        borderRadius: 4,
        px: { xs: 3, sm: 4 },
        py: { xs: 3, sm: 4.5 },
        border: "1px solid",
        borderColor: "divider",
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? "rgba(15,15,15,0.9)"
            : "rgba(255,255,255,0.95)",
        backdropFilter: "blur(18px)",
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
        }}
      >
        <Box>
          <Typography variant="overline" color="text.secondary">
            Langkah cepat
          </Typography>
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontWeight: 600, mt: 0.5, mb: 0.5 }}
          >
            Konversi gambar logbook ke PDF
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Unggah satu atau beberapa gambar JPG/PNG dengan kualitas jelas.
            Untuk setiap foto, pilih tanggal kunjungan. Kami akan membuatkan
            PDF dengan nama file sesuai tanggal tersebut.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box
            component="label"
            sx={{
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 3,
              px: 2.5,
              py: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              cursor: "pointer",
              background:
                "linear-gradient(135deg, rgba(244,244,245,0.8), rgba(228,228,231,0.4))",
              transition:
                "border-color 150ms ease, background 150ms ease, transform 120ms ease",
              "&:hover": {
                borderColor: "primary.main",
                background:
                  "linear-gradient(135deg, rgba(239,246,255,0.9), rgba(224,231,255,0.7))",
                transform: "translateY(-1px)",
              },
              ...(isDragging && {
                borderColor: "primary.main",
                background:
                  "linear-gradient(135deg, rgba(239,246,255,0.95), rgba(224,231,255,0.9))",
                transform: "translateY(-1px)",
              }),
            }}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              hidden
              accept="image/png,image/jpeg"
              multiple
              onChange={handleFileChange}
            />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Klik atau seret dan lepaskan gambar di sini
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              Format yang didukung: JPG, PNG. Bisa memilih beberapa file
              sekaligus.
            </Typography>
          </Box>
        </Box>

        {items.length > 0 && (
          <Box
            sx={{
              mt: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              Daftar foto yang akan dikonversi
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(3, minmax(0, 1fr))",
                },
                gap: 1.5,
              }}
            >
              {items.map((item) => (
                <Paper
                  key={item.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    width: "100%",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      borderRadius: 1.5,
                      overflow: "hidden",
                      bgcolor: "background.default",
                      cursor: "zoom-in",
                    }}
                    onClick={() => setPreviewItem(item)}
                  >
                    <Box
                      component="img"
                      src={item.previewUrl}
                      alt={item.file.name}
                      sx={{
                        width: "100%",
                        height: { xs: 200, sm: 220 },
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  </Box>

                  <Box sx={{ mt: 0.5 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, wordBreak: "break-word" }}
                    >
                      {item.file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Asli: {formatBytes(item.originalSize)} · Perkiraan PDF:{" "}
                      {formatBytes(item.estimatedPdfSize)}
                    </Typography>
                    {item.status !== "idle" && (
                      <Typography
                        variant="caption"
                        color={
                          item.status === "success"
                            ? "success.main"
                            : item.status === "error"
                            ? "error.main"
                            : "text.secondary"
                        }
                        sx={{ display: "block", mt: 0.5 }}
                      >
                        {item.status === "converting" && "Mengonversi..."}
                        {item.status === "success" && "Berhasil dikonversi."}
                        {item.status === "error" && "Gagal dikonversi."}
                      </Typography>
                    )}
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      mt: 1,
                    }}
                  >
                    <TextField
                      type="date"
                      fullWidth
                      size="small"
                      label="Tanggal kunjungan"
                      InputLabelProps={{ shrink: true }}
                      value={item.date}
                      onChange={(e) =>
                        handleItemDateChange(item.id, e.target.value)
                      }
                    />
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isLoading}
                    >
                      Hapus
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading || items.length === 0}
            sx={{
              borderRadius: 999,
              textTransform: "none",
              py: 1,
              fontWeight: 600,
            }}
          >
            {isLoading ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} /> Mengonversi...
              </>
            ) : (
              "Konversi ke PDF"
            )}
          </Button>
        </Box>
      </Box>

      <Dialog
        open={!!previewItem}
        onClose={() => setPreviewItem(null)}
        maxWidth="md"
        fullWidth
      >
        {previewItem && (
          <Box
            sx={{
              p: 2,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Box
              component="img"
              src={previewItem.previewUrl}
              alt={previewItem.file.name}
              sx={{
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: 2,
                objectFit: "contain",
              }}
            />
          </Box>
        )}
      </Dialog>
    </Paper>
  );
}
