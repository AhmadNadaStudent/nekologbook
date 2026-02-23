import { UploadForm } from "@/components/UploadForm";

export default function Home() {
  return (
    <div className="animated-rgb-bg flex min-h-screen items-center justify-center text-zinc-50">
      <main className="w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16 font-sans flex flex-col items-center text-center">
        <header className="mb-8 sm:mb-10">
          <p className="text-xs font-semibold tracking-[0.2em] text-zinc-50 uppercase mb-3">
            NEKOLOGBOOK
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
            Ubah foto Laporan menjadi PDF ukuran kecil.
          </h1>
          <p className="text-sm sm:text-base text-zinc-50 max-w-xl mx-auto">
            Unggah satu foto laporan, pilih tanggal kunjungan, dan kami
            akan membuatkan PDF berukuran ringan siap upload siakad.
          </p>
        </header>

        <UploadForm />

        <p className="mt-6 text-[11px] sm:text-xs text-zinc-500 text-center">
          Data hanya diproses di server ini untuk membuat PDF dan tidak
          disimpan sebagai log jangka panjang.
        </p>
      </main>
    </div>
  );
}
