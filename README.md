Berikut adalah versi PRD yang telah dirapikan menggunakan format Markdown (huruf tebal, daftar berpoin, dan blok kode untuk visualisasi hierarki) agar lebih mudah dibaca dan disalin, **tanpa menghilangkan satu pun kata, field, atau detail dari draft asli Anda**.

---

# PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Nama Produk:** LogBook.ID
**Versi:** MVP 1.0
**Status:** Final Draft

---

## 1. PRODUCT VISION

LogBook.ID adalah platform pembuatan logbook digital yang memungkinkan pengguna mencatat kegiatan harian secara terstruktur berdasarkan tanggal, menyimpan dokumentasi ke Google Drive pribadi, dan menghasilkan laporan logbook otomatis dalam format Google Docs maupun PDF.

**Tujuan utama produk:**
"Menghilangkan kebutuhan membuat logbook manual di Microsoft Word."

---

## 2. TARGET USERS

**Utama**

* Mahasiswa KKN
* Mahasiswa PKL
* Mahasiswa Magang
* Mahasiswa MBKM
* Mahasiswa Penelitian

**Sekunder**

* Guru
* Dosen
* Relawan
* Organisasi Kampus
* Tim Proyek

---

## 3. CORE CONCEPT

**Struktur data aplikasi:**

```text
User
│
└── Logbook
    │
    ├── Hari/Tanggal
    │   ├── Kegiatan
    │   ├── Kegiatan
    │   └── Kegiatan
    │
    ├── Hari/Tanggal
    │   ├── Kegiatan
    │   └── Kegiatan
    │
    └── Hari/Tanggal

```

**Contoh:**

```text
KKN Desa Bontoa
├── 📅 Senin, 1 Juli 2026
│   ├── Sosialisasi Sampah
│   ├── Survey Lapangan
│   └── Pembuatan Banner
│
├── 📅 Selasa, 2 Juli 2026
│   ├── Pendataan Warga
│   └── Rapat Koordinasi
│
└── 📅 Rabu, 3 Juli 2026
    └── Penyuluhan

```

* Hari/Tanggal berfungsi sebagai grup kegiatan.
* Kegiatan tidak boleh berdiri sejajar dengan Hari.

---

## 4. USER FLOW

**LOGIN**
User membuka aplikasi
↓
Login dengan Google
↓
Akun dibuat otomatis
↓
Masuk Dashboard

---

## 5. DASHBOARD

Menampilkan seluruh logbook milik user.

**Layout:**

```text
[ + Buat Logbook ]
──────────────────
📘 KKN Desa Bontoa
25 Hari
86 Kegiatan
⋮
──────────────────
📘 PKL PT ABC
15 Hari
43 Kegiatan
⋮
──────────────────

```

**Fungsi Dashboard:**

* Membuat Logbook
* Membuka Logbook
* Mengelola Logbook

---

## 6. MEMBUAT LOGBOOK

**Klik:** `Buat Logbook`

**Form:**

* Nama Logbook
* Deskripsi
* Jenis Logbook

**Pilihan:**

* KKN
* PKL
* MBKM
* Penelitian
* Organisasi
* Lainnya

**Simpan** ↓
Logbook muncul di Dashboard.

---

## 7. MENU LOGBOOK

Setiap Logbook memiliki menu: `⋮`

**Isi menu:**

* Detail
* Export
* Rename
* Delete

---

## 8. HALAMAN LOGBOOK

Ketika Logbook dibuka:

**Contoh:**

```text
KKN Desa Bontoa
Logbook kegiatan KKN Universitas XYZ.
──────────────────
[ + Tambah Kegiatan ]
──────────────────
📅 Senin, 1 Juli 2026 ▼

 08.00 - 10.00
 Sosialisasi Sampah

 10.30 - 12.00
 Survey Lapangan

 13.00 - 15.00
 Pembuatan Banner

 [+ Tambah Kegiatan]
──────────────────
📅 Selasa, 2 Juli 2026 ▶
──────────────────
📅 Rabu, 3 Juli 2026 ▶

```

**Konsep:**

* Hari dapat di-expand dan collapse.
* Tidak ada halaman khusus Hari.
* Semua aktivitas berada dalam satu halaman Logbook.

---

## 9. MENAMBAH KEGIATAN

**User klik:** `Tambah Kegiatan`

**Form:**

* Tanggal
* Jam Mulai
* Jam Selesai
* Nama Kegiatan
* Deskripsi Kegiatan
* Kendala (Opsional)
* Dokumentasi Foto
* Simpan

---

## 10. AUTO DAY GROUPING

Jika tanggal belum ada:
Sistem otomatis membuat grup hari baru.

**Contoh:**
Tanggal: `5 Juli 2026`
↓
Hari: `Sabtu, 5 Juli 2026` dibuat otomatis.
User tidak perlu membuat Hari secara manual.

---

## 11. DETAIL KEGIATAN

**Tampilan:**

> **08.00 - 10.00**
> **Sosialisasi Sampah**
> **Deskripsi**
> Melakukan sosialisasi kepada warga mengenai pengelolaan sampah.
> **Kendala**
> Tidak semua warga hadir.
> **Dokumentasi**
> 📷 Foto 1
> 📷 Foto 2
> 📷 Foto 3

---

## 12. FOTO DOKUMENTASI

* Setiap kegiatan dapat memiliki banyak foto.
* **Maksimal:** 20 foto per kegiatan.
* **Sebelum upload:** Foto dikompresi otomatis.

**Tujuan:**

* Menghemat kuota Drive.
* Mempercepat upload.
* Mempercepat export PDF.

---

## 13. GOOGLE DRIVE INTEGRATION

**Saat login pertama:**
Sistem membuat folder:

```text
My Drive
└── LogBook.ID

```

**Saat membuat Logbook:**

```text
My Drive
└── LogBook.ID
    └── KKN Desa Bontoa

```

**Saat upload dokumentasi:**
Foto masuk ke folder logbook.
Database hanya menyimpan:

* Google File ID
* URL
* Metadata

*Catatan: Foto fisik tetap milik user.*

---

## 14. EXPORT SYSTEM

Export diakses melalui:
`Dashboard` ↓ `⋮` ↓ `Export`

---

## 15. HALAMAN EXPORT

**Menampilkan:**

* Nama Logbook
* Jumlah Hari
* Jumlah Kegiatan
* Jumlah Dokumentasi

**Pilihan:**

* ○ Google Docs
* ○ PDF

---

## 16. STRUKTUR DOKUMEN HASIL EXPORT

**SAMPUL**

* Judul Logbook
* Nama Peserta
* Institusi
* Periode
* Logo

**DAFTAR KEGIATAN**

* **Hari/Tanggal:** Senin, 1 Juli 2026
* **Sosialisasi Sampah**
* **Jam:** 08.00 - 10.00
* **Deskripsi:** ...
* **Kendala:** ...
* **Dokumentasi:** Foto


* **Survey Lapangan**
* **Jam:** 10.30 - 12.00
* **Deskripsi:** ...
* **Kendala:** ...
* **Dokumentasi:** Foto




* **Hari/Tanggal:** Selasa, 2 Juli 2026
* *dan seterusnya.*



---

## 17. DATABASE DESIGN

**`users`**

* `id`
* `name`
* `email`
* `avatar`

**`logbooks`**

* `id`
* `user_id`
* `title`
* `description`
* `type`
* `created_at`

**`activities`**

* `id`
* `logbook_id`
* `activity_date`
* `start_time`
* `end_time`
* `title`
* `description`
* `obstacle`
* `created_at`

**`photos`**

* `id`
* `activity_id`
* `google_file_id`
* `google_drive_url`

**Catatan:**

* Tabel Day tidak diperlukan.
* Hari dibentuk otomatis dari `activity_date`.

---

## 18. MVP FEATURES

**Included**

* ✅ Login Google
* ✅ Dashboard Logbook
* ✅ CRUD Logbook
* ✅ CRUD Kegiatan
* ✅ Multi Upload Foto
* ✅ Google Drive Storage
* ✅ Auto Grouping Hari
* ✅ Expand / Collapse Hari
* ✅ Export Google Docs
* ✅ Export PDF
* ✅ Mobile Responsive

---

## 19. FUTURE FEATURES

**Version 2**

* Template Kampus
* Tanda Tangan Otomatis
* Export DOCX
* Kolaborasi Tim

**Version 3**

* AI Perbaikan Deskripsi
* AI Ringkasan Harian
* AI Pembuatan Laporan Akhir

**Version 4**

* Mobile App Android
* Mobile App iOS

---

## 20. TECH STACK

**Frontend**

* Next.js 15
* TypeScript
* Tailwind CSS
* shadcn/ui

**Authentication**

* Google OAuth
* NextAuth

**Database**

* PostgreSQL (Supabase)

**Storage**

* Google Drive User

**Export**

* Google Docs API

**Hosting**

* Vercel

**Image Compression**

* Browser-side Compression

**Target MVP:**

* 1 Developer
* 4–7 Hari pengerjaan
* Siap digunakan untuk KKN, PKL, MBKM, dan Penelitian.