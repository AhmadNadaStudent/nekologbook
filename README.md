## Nekologbook

Alat kecil berbasis Next.js untuk mengonversi 1 gambar JPG/PNG menjadi file PDF berukuran maksimal 1 MB. Nama file PDF akan mengikuti tanggal yang kamu pilih.

### Fitur
- Upload 1 file gambar (JPG/PNG)
- Pilih tanggal untuk nama file PDF (format dd-mm-yy)
- Otomatis mengecilkan resolusi gambar jika ukuran PDF terlalu besar
- Feedback error dan sukses langsung di UI

### Teknologi yang Digunakan
- Next.js 16 (App Router)
- React 19
- Material UI (MUI)
- Tailwind CSS 4
- pdf-lib & sharp untuk pembuatan PDF

### Menjalankan Secara Lokal

Pastikan Node.js sudah terpasang.

1. Install dependency:

	```bash
	npm install
	```

2. Jalankan server development:

	```bash
	npm run dev
	```

3. Buka di browser:

	```
	http://localhost:3000
	```

### Cara Pakai
- Buka halaman utama aplikasi
- Pilih tanggal yang akan dipakai sebagai nama file PDF
- Klik tombol "Pilih Gambar" dan pilih satu file JPG/PNG
- Klik tombol "Konversi ke PDF"
- Jika ukuran PDF terlalu besar, aplikasi akan menawarkan untuk menurunkan resolusi
- Setelah berhasil, unduhan file PDF akan dimulai otomatis

### Catatan
- Hanya mendukung 1 file gambar per konversi
- Hanya mendukung format `image/jpeg` dan `image/png`
- Batas ukuran PDF saat ini adalah 1 MB

