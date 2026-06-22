# LogBook.ID — Development Setup Guide

Dokumen ini berisi semua langkah yang wajib disiapkan sebelum menjalankan project LogBook.ID secara lokal maupun production.

---

# 1. GOOGLE CLOUD SETUP (WAJIB)

## 1.1 Buat Project
Masuk ke Google Cloud Console:
https://console.cloud.google.com

- Create New Project
- Nama: LogBook-ID

---

## 1.2 Enable API (WAJIB AKTIFKAN)

Aktifkan API berikut:

- Google Drive API
- Google Docs API
- Google People API

---

## 1.3 OAuth Consent Screen

Masuk ke:
APIs & Services → OAuth consent screen

### Setup:
- User Type: External
- App Name: LogBook.ID
- User support email: (email kamu)

### Scopes yang wajib:
- email
- profile
- https://www.googleapis.com/auth/drive
- https://www.googleapis.com/auth/documents

---

## 1.4 OAuth Client ID

Buat Credential:
- Type: Web Application

### Authorized Redirect URI:

Local:
http://localhost:3000/api/auth/callback/google

Production:
https://your-domain.com/api/auth/callback/google

---

# 2. SUPABASE SETUP

Masuk ke:
https://supabase.com

## 2.1 Create Project

Simpan credential berikut:
- DATABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

---

## 2.2 Database Tables

Buat tabel berikut:

### users
- id (uuid)
- google_id (unique)
- name
- email
- avatar
- created_at

### logbooks
- id
- user_id
- title
- description
- type
- created_at

### activities
- id
- logbook_id
- activity_date
- start_time
- end_time
- title
- description
- obstacle
- created_at

### photos
- id
- activity_id
- google_file_id
- google_drive_url

---

# 3. GOOGLE DRIVE STRUCTURE

Saat user login pertama kali:

Root folder:
LogBook.ID/

Struktur:
LogBook.ID/
└── user@email.com/
    ├── KKN Desa A/
    ├── PKL PT B/

---

# 4. GOOGLE AUTH FLOW (NEXTAUTH)

Login flow:

1. User login dengan Google
2. NextAuth callback triggered
3. System cek user di database
4. Jika belum ada → create user
5. Create Google Drive root folder
6. Simpan folder_id ke database
7. Redirect ke dashboard

---

# 5. ENVIRONMENT VARIABLES

Buat file:

`.env.local`

## Required variables:

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

DATABASE_URL=

SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

---

# 6. NEXTAUTH SCOPES

Pastikan Google provider menggunakan scope:

- openid
- email
- profile
- https://www.googleapis.com/auth/drive
- https://www.googleapis.com/auth/documents

---

# 7. FIRST RUN CHECKLIST

Sebelum mulai development pastikan:

- [ ] Google Cloud project sudah dibuat
- [ ] Drive API aktif
- [ ] Docs API aktif
- [ ] OAuth Client ID sudah dibuat
- [ ] Redirect URI sudah benar
- [ ] Supabase project sudah aktif
- [ ] Database tables sudah dibuat
- [ ] .env.local sudah lengkap

---

# 8. TEST FLOW (WAJIB BERHASIL)

Setelah run project:

## Test 1 - Login
- Login Google berhasil
- Callback tidak error

## Test 2 - Database
- User otomatis masuk tabel `users`

## Test 3 - Google Drive
- Folder "LogBook.ID" dibuat di Drive user

## Test 4 - Redirect
- User masuk dashboard setelah login

---

# 9. RULES ARCHITECTURE (PENTING)

- Foto tidak disimpan di database (hanya metadata)
- File disimpan di Google Drive user
- Hari/Tanggal tidak pakai tabel (grouping dari activity_date)
- DB hanya untuk metadata

---

# 10. NOTES

Jika salah satu step di atas gagal:
- jangan lanjut ke feature development
- perbaiki auth + drive integration dulu

Project ini sangat bergantung pada Google OAuth + Drive API
jadi setup harus benar dari awal.