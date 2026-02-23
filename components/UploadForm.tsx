"use client";

import { useState, FormEvent, ChangeEvent, DragEvent } from "react";
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  TextField,
} from "@mui/material";

export function UploadForm() {
  const getTodayAsInputDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayAsInputDate);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelected = (file: File | null) => {
    setError(null);
    setSuccess(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Hanya mendukung gambar JPG atau PNG.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    handleFileSelected(file);
  };

  const handleDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    setSelectedDate(event.target.value);
  };

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

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    handleFileSelected(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedFile) {
      setError("Silakan pilih satu file gambar terlebih dahulu.");
      return;
    }

    if (!selectedDate) {
      setError("Silakan pilih tanggal terlebih dahulu.");
      return;
    }

    if (!["image/jpeg", "image/png"].includes(selectedFile.type)) {
      setError("Hanya mendukung gambar JPG atau PNG.");
      return;
    }
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

      setSuccess("PDF berhasil dibuat, unduhan dimulai.");
    };

    const requestConversion = async (reduceResolution: boolean): Promise<void> => {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("date", selectedDate);
      if (reduceResolution) {
        formData.append("reduceResolution", "true");
      }

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        await downloadPdf(response);
        return;
      }

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        setError("Gagal mengonversi gambar.");
        return;
      }

      if (!reduceResolution && data?.errorCode === "PDF_TOO_LARGE_INITIAL") {
        const sizeMb = data.sizeMb ?? "?";
        const confirmMessage = `Hasil file terlalu besar (${sizeMb} MB). Turunkan resolusi?`;
        const shouldReduce = window.confirm(confirmMessage);

        if (shouldReduce) {
          await requestConversion(true);
          return;
        }

        setError(data?.error || "Gagal mengonversi gambar.");
        return;
      }

      if (reduceResolution && data?.errorCode === "PDF_TOO_LARGE_FINAL") {
        const sizeMb = data.sizeMb ?? "?";
        setError(
          `Tidak dapat membuat PDF di bawah 1 MB meskipun resolusi sudah diturunkan (ukuran saat ini ${sizeMb} MB).`
        );
        return;
      }

      setError(data?.error || "Gagal mengonversi gambar.");
    };

    try {
      setIsLoading(true);
      await requestConversion(false);
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
        fontFamily: "var(--font-museo)",
        width: "100%",
        maxWidth: 520,
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
            Unggah 1 gambar JPG/PNG dengan kualitas jelas, lalu pilih tanggal
            kunjungan. Kami akan membuatkan PDF dengan nama file sesuai tanggal
            tersebut.
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

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          <TextField
            type="date"
            fullWidth
            size="small"
            label="Tanggal kunjungan"
            InputLabelProps={{ shrink: true }}
            value={selectedDate}
            onChange={handleDateChange}
            helperText="Digunakan untuk nama file PDF (format tgl-bulan-thn)."
          />
        </Box>

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
              transition: "border-color 150ms ease, background 150ms ease, transform 120ms ease",
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
              onChange={handleFileChange}
            />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Klik atau seret dan lepaskan gambar di sini
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Format yang didukung: JPG, PNG. 1 file per konversi.
            </Typography>
            {selectedFile && (
              <Typography
                variant="caption"
                sx={{ mt: 1, px: 1.5, py: 0.5, borderRadius: 999, bgcolor: "rgba(24,24,27,0.04)" }}
              >
                File terpilih: {selectedFile.name}
              </Typography>
            )}
          </Box>
        </Box>

        <Button
          type="submit"
          variant="contained"
          disabled={isLoading || !selectedFile || !selectedDate}
          sx={{
            mt: 0.5,
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
    </Paper>
  );
}
