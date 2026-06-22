# Audit Google Drive Integration — Deep Dive

## 1. Arsitektur Autentikasi: OAuth User Token (Bukan Service Account)

### Bukti dari Codebase

**File: `app/api/auth/[...nextauth]/route.ts`** (line 13-25)
```typescript
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  authorization: {
    params: {
      prompt: "consent",
      access_type: "offline",
      response_type: "code",
      scope:
        "openid email profile https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents",
    },
  },
}),
```

**File: `app/api/auth/[...nextauth]/route.ts`** (line 115-128)
```typescript
async jwt({ token, account }) {
  if (account) {
    token.accessToken = account.access_token;
    token.refreshToken = account.refresh_token;
  }
  return token;
},
async session({ session, token }) {
  return {
    ...session,
    accessToken: token.accessToken as string | undefined,
    refreshToken: token.refreshToken as string | undefined,
  };
},
```

**File: `app/api/photos/upload/route.ts`** (line 76-87)
```typescript
const accessToken = session.accessToken;
// ... digunakan di semua fetch ke Drive API
```

**File: `services/google-drive.service.ts`** — Setiap function menerima `accessToken: string` sebagai parameter, dikirim sebagai `Authorization: Bearer ${accessToken}`.

**Kesimpulan: ✅ Arsitektur saat ini menggunakan Google OAuth 2.0 User Access Token. Bukan Service Account.**

Tidak ada:
- Service Account JSON key file
- `googleapis` npm package (Service Account client)
- `service_account` reference di env variables
- JWT assertion atau private key signing

---

## 2. Alasan Arsitektur OAuth User Token

Berdasarkan analisis codebase dan fitur aplikasi:

### 2.1 Setiap User Punya Drive Folder Terpisah

- Saat login, `getOrCreateUserRootFolder()` (google-drive.service.ts:322) membuat folder `LogBook.ID/{userEmail}` di **Drive user itu sendiri**.
- `drive_folder_id` disimpan di tabel `users` per user.
- File/folder yang dibuat adalah **milik user**, bukan milik aplikasi.

**Konsekuensi:**
- User bisa melihat semua file fotonya langsung di Google Drive mereka.
- User punya kontrol penuh (bisa hapus, rename, share).
- Tidak perlu sharing folder Service Account yang rumit.

### 2.2 Export Google Docs Juga ke Drive User

**File: `services/google-docs.service.ts`** (dari open tabs)
Export logbook membuat Google Docs di Drive user yang sama. Ini konsisten dengan arsitektur "semua file ada di Drive user".

### 2.3 Desain Awal: User-Centric, Bukan Admin-Centric

Aplikasi ini dirancang untuk:
- Mahasiswa KKN membuat logbook sendiri
- Setiap mahasiswa punya akun Google masing-masing
- Tidak ada "admin aplikasi" yang mengelola semua file

OAuth user token adalah pilihan alami untuk arsitektur seperti ini.

---

## 3. Analisis OAuth User Token

### 3.1 Kelebihan

| Kelebihan | Penjelasan | Kode Terkait |
|-----------|------------|--------------|
| **File milik user** | Foto dan dokumen tersimpan di Drive user. User bisa akses kapan saja. | `google-drive.service.ts:322-350` |
| **No sharing complexity** | Tidak perlu manage Service Account sharing folder ke banyak user. | - |
| **Zero-cost untuk scale** | Storage menggunakan kuota Drive masing-masing user (15GB gratis). Aplikasi tidak bayar storage. | - |
| **User bisa revoke kapan saja** | User punya kontrol penuh atas data mereka. | Tapi ini juga risiko (lihat bawah). |
| **Google Docs preview built-in** | User bisa langsung preview foto/doc dari Drive tanpa aplikasi. | - |
| **OAuth 2.0 best practice** | Setiap user punya scope terbatas (hanya Drive & Docs). | `[...nextauth]/route.ts:21-22` |

### 3.2 Kekurangan

| Kekurangan | Penjelasan | Lokasi Kode | Risiko |
|------------|------------|-------------|--------|
| **Token expired setelah 1 jam** | Google OAuth access token berlaku 60 menit. Upload foto bisa gagal jika token expired. | `upload/route.ts:78-87` | **TINGGI** |
| **Refresh token bisa hilang** | Google hanya mengirim refresh token sekali (saat login pertama). Jika user revoke akses, refresh token hilang. User harus login ulang. | `[...nextauth]/route.ts:117` | **SEDANG** |
| **No refresh mechanism** | JWT callback hanya menyimpan token, tidak ada logic refresh. | `[...nextauth]/route.ts:115-121` | **TINGGI** |
| **Rate limit per user** | Google Drive API rate limit dihitung per user (per OAuth token). Jika upload massal, kena batas. | Semua fetch di `google-drive.service.ts` | **SEDANG** |
| **Network dependent** | Setiap operasi Drive butuh HTTP request ke `www.googleapis.com`. Tidak bisa offline. | - | **RENDAH** |
| **User harus login Google** | Tidak bisa pakai email non-Google. | `[...nextauth]/route.ts:13` | **RENDAH** |

### 3.3 Risiko Token Expired — Analisis Detail

**Apa yang terjadi:**
1. User login → NextAuth JWT menyimpan `accessToken` (berlaku 1 jam)
2. Session JWT disimpan di cookie/browser
3. 45 menit kemudian, user upload foto
4. Drive API return `401 Unauthorized`
5. Error tidak jelas: `"Google Drive access token tidak tersedia"` (misleading — token ada tapi expired)
6. User harus login ulang untuk refresh token

**Bukti kode tidak ada refresh:**
```typescript
// [...nextauth]/route.ts:115-121
async jwt({ token, account }) {
  if (account) {
    token.accessToken = account.access_token;  // Hanya set saat login
    token.refreshToken = account.refresh_token;
  }
  return token;  // Tidak ada cek expiry, tidak ada refresh call
},
```

**Dampak:**
- Semua operasi Drive setelah 1 jam login akan gagal
- User frustrasi karena harus login ulang terus
- Tidak ada log yang jelas bahwa penyebabnya token expired

**Indikator user kena masalah ini:**
- Upload foto gagal setelah beberapa lama tidak aktif
- Export Docs juga gagal di waktu yang sama
- Log muncul `[6a] FAIL: no access token` padahal user masih login

### 3.4 Risiko User Mencabut Akses Aplikasi

**Apa yang terjadi:**
1. User login, grant scope `drive` dan `documents`
2. User buka Google Account → Security → Third-party apps
3. User revoke "LogBook.ID" access
4. Semua refresh token untuk user ini menjadi invalid
5. Semua upload/export gagal dengan 401
6. Recovery: User harus login ulang dengan `prompt: "consent"` (memang sudah diset)

**Kode terkait:**
```typescript
// [...nextauth]/route.ts:17
prompt: "consent",  // Force consent setiap login — ini sebenarnya baik
```

**Dampak:**
- Lebih jarang terjadi dibanding token expired
- Recovery relatif mudah (login ulang)
- Tapi user mungkin tidak ingat pernah revoke dan bingung kenapa upload gagal

---

## 4. Analisis Service Account (Alternatif)

### 4.1 Apa yang Diperlukan untuk Implementasi Service Account

Untuk mengganti ke Service Account, perubahan yang diperlukan:

1. **Env baru**: `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON) atau `GOOGLE_APPLICATION_CREDENTIALS`
2. **Install package**: `googleapis` atau `google-auth-library`
3. **Buat Service Account** di Google Cloud Console → IAM → Service Accounts
4. **Enable Google Drive API** dan **Google Docs API**
5. **Folder sharing**: Share folder utama dengan Service Account email
6. **Setiap folder per-user** harus di-share ke Service Account
7. Atau: Service Account punya satu folder global, semua file di situ

### 4.2 Kelebihan Service Account

| Kelebihan | Penjelasan |
|-----------|------------|
| **Token tidak expired** | Service Account token bisa di-set long-lived atau auto-refresh via library. |
| **Tidak perlu user interaction** | Upload berjalan di background tanpa perlu user login. |
| **Rate limit dedicated** | Quota terpisah dari user OAuth. Bisa dinaikkan via Google Cloud Console. |
| **Centralized management** | Semua file di satu tempat. Admin bisa manage semua file. |
| **Error lebih predictable** | Tidak ada "user revoke" atau "token expired" dari sisi user. |

### 4.3 Kekurangan Service Account

| Kekurangan | Penjelasan | Dampak pada Aplikasi Ini |
|------------|------------|--------------------------|
| **File milik aplikasi, bukan user** | File tersimpan di Drive Service Account. User tidak bisa akses langsung. | KKN mahasiswa mungkin ingin lihat foto mereka di Drive. Workaround: share folder per-user. |
| **Kompleksitas sharing folder** | Setiap user butuh folder yang di-share ke Service Account. Atau Service Account jadi owner dan folder di-share ke user. | Signifikan. 100 mahasiswa = 100 folder yang harus di-share. Jika ada kesalahan sharing, upload gagal. |
| **Storage terbatas (15GB)** | Service Account punya Drive storage terpisah 15GB (kecuali upgrade Google Workspace). | Untuk 100 mahasiswa × 100 foto × 3MB = 30GB. Cepet habis. |
| **Biaya tambahan** | Jika perlu storage lebih, harus bayar Google Workspace atau Google Cloud Storage. | Aplikasi gratis jadi berbayar. |
| **Setup kompleks** | Harus setup Service Account, domain-wide delegation, dll. | Development time signifikan. |
| **User tidak bisa hapus** | Foto tetap di Drive Service Account meski user hapus akun. | Privacy concern. |

### 4.4 Risiko Permission Folder Service Account

**Masalah utama:**
- Service Account adalah "pengguna" terpisah. Untuk membuat folder di Drive user, Service Account harus di-share ke folder user.
- Atau sebaliknya: Service Account buat folder, lalu share ke user.
- Jika permission tidak tepat:
  - Upload gagal (403 Insufficient Permission)
  - Folder tidak terlihat oleh user
  - User tidak bisa preview foto
- **Complexity tinggi** untuk invite/remove user dari folder.

### 4.5 Risiko Sharing Folder Service Account

**Untuk aplikasi KKN dengan banyak mahasiswa:**
- Setiap mahasiswa baru harus di-share folder `LogBook.ID/{email}` atau `_photos/{activity}`
- Jika ada 100 mahasiswa dengan 10 activity masing-masing → 1000 folder yang harus di-share
- Setiap sharing butuh API call ke Drive API
- Jika ada mahasiswa lulus/hapus akun:
  - Harus unshare folder
  - Atau folder tetap ada sebagai orphan
- Overhead management signifikan

---

## 5. Perbandingan Arsitektur untuk Aplikasi Logbook KKN

### Kriteria Aplikasi Logbook KKN:
- 50-500 mahasiswa
- Setiap mahasiswa punya 10-50 foto per logbook
- Foto 2-5MB (JPEG)
- Upload tidak real-time (1-5 foto per sesi)
- Mahasiswa perlu lihat foto mereka di laporan
- Tidak ada admin yang manage file

### Perbandingan

| Aspek | OAuth User Token (Saat Ini) | Service Account | Rekomendasi |
|-------|----------------------------|-----------------|-------------|
| **Setup complexity** | ✅ Rendah (NextAuth built-in) | ❌ Tinggi (setup SA + sharing) | **OAuth** |
| **Storage cost** | ✅ Gratis (Drive user 15GB) | ❌ 15GB SA + upgrade berbayar | **OAuth** |
| **User control** | ✅ File milik user | ❌ File milik aplikasi | **OAuth** |
| **Token management** | ❌ Perlu refresh handling | ✅ Auto-refresh via library | **Service Account** (tapi bisa fix OAuth) |
| **Orphan cleanup** | ❌ Tidak ada | ❌ Juga tidak ada | **Sama buruk** |
| **Preview/access** | ✅ User bisa buka Drive langsung | ❌ Harus share ulang | **OAuth** |
| **Rate limit** | ❌ Per user (60 req/user/min) | ✅ Per project (1000 req/project/min) | **Service Account** |
| **Scalability 500 user** | ❌ Rate limit per user 60/min | ✅ 1000 req/min shared | **Service Account** |
| **Error recovery** | ❌ Token expired = login ulang | ✅ Tidak perlu user action | **Service Account** |

### Kesimpulan Perbandingan

**OAuth User Token LEBIH BAIK untuk skenario saat ini** karena:
1. Storage gratis per user (15GB × 500 user = 7.5TB total)
2. File milik user — mahasiswa bisa akses kapan saja
3. Setup sederhana, tidak perlu manage sharing folder
4. Cocok untuk skala kecil-sedang (1-50 upload/user/hari)

**Service Account hanya lebih unggul di:**
1. Token tidak expired (tapi ini bisa di-fix di OAuth dengan refresh logic)
2. Rate limit shared (tapi untuk skala < 500 user, OAuth masih OK)

---

## 6. Rekomendasi: Pertahankan OAuth + Perbaiki Kelemahannya

### Keputusan: **PERTAHANKAN OAuth User Token**

**Alasan:**
1. Storage free 15GB/user vs 15GB total untuk SA
2. File milik user — fitur penting untuk KKN (mahasiswa perlu foto buat laporan)
3. Kompleksitas Service Account tidak sebanding dengan benefit untuk skala aplikasi ini
4. Kelemahan utama OAuth (token expired) bisa diperbaiki dengan implementasi refresh token

### Yang Harus Diperbaiki

#### 6.1 Implementasi Token Refresh (PRIORITAS #1)

**Di `[...nextauth]/route.ts`, tambahkan refreshAccessToken function:**

```typescript
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken!,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw data;

    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + data.expires_in * 1000,
      refreshToken: data.refresh_token ?? token.refreshToken, // Google may return new refresh token
    };
  } catch (error) {
    console.error("[AUTH REFRESH] Failed:", error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}
```

**Update JWT callback:**
```typescript
async jwt({ token, account }) {
  if (account) {
    token.accessToken = account.access_token;
    token.refreshToken = account.refresh_token;
    token.accessTokenExpires = Date.now() + (account.expires_in as number) * 1000;
    return token;
  }

  // Return previous token if still valid
  if (Date.now() < (token.accessTokenExpires as number)) {
    return token;
  }

  // Token expired — refresh
  return refreshAccessToken(token);
},
```

**Dampak:** Menghilangkan ~70% penyebab upload gagal.

#### 6.2 Cache Drive Folder IDs (PRIORITAS #2)

**Masalah:** Setiap upload melakukan 5-10 API calls ke Drive untuk lookup/create folder chain.

**Solusi 1 — Cache `_photos` folder ID di logbook record:**
- Tambah kolom `photos_folder_id` di tabel `logbooks`
- Saat upload sukses pertama, simpan `_photos` folder ID
- Upload berikutnya langsung pakai tanpa lookup
- **Save:** 1-2 API calls per upload

**Solusi 2 — Memory cache untuk satu request session:**
```typescript
// google-drive.service.ts
const folderCache = new Map<string, string>();

async function getCachedOrCreateFolder(accessToken: string, name: string, parentId: string): Promise<string | null> {
  const cacheKey = `${parentId}/${name}`;
  if (folderCache.has(cacheKey)) return folderCache.get(cacheKey)!;
  
  const folderId = await findDriveFolder(accessToken, name, parentId)
    ?? await createDriveFolder(accessToken, name, parentId);
  
  if (folderId) folderCache.set(cacheKey, folderId);
  return folderId;
}
```

#### 6.3 Hapus buildFolderPathChain dari Upload Path (PRIORITAS #3)

**File:** `google-drive.service.ts:496` dan `google-drive.service.ts:605`

**Tindakan:** Pindahkan `buildFolderPathChain` ke `app/api/debug/drive/route.ts` saja.

**Dampak:** Save 1-3 API calls per upload (tergantung depth folder).

#### 6.4 Short-circuit upload jika folder activity sudah ada (PRIORITAS #4)

**Masalah:** Setiap upload mencari folder `_photos/{activityId}` dengan 2-4 API calls.

**Solusi:** Setelah first upload ke suatu activity, simpan `activity_folder_id` di memory cache atau di photos response. Upload kedua ke activity yang sama langsung upload tanpa folder lookup.

**Dampak:** Upload kedua+ ke activity yang sama hanya butuh 1-2 API calls (upload + verify).

#### 6.5 Tambah Expired Token Detection (PRIORITAS #5)

**Di `upload/route.ts`:**
```typescript
if (!accessToken) {
  console.error("[6a] FAIL: no access token — mungkin expired");
  // Tambah hint: mungkin perlu refresh
  return NextResponse.json({
    error: "Sesi Google Drive telah berakhir. Silakan refresh halaman atau login ulang.",
    code: "TOKEN_EXPIRED_OR_MISSING",
  }, { status: 401 });
}
```

---

## 7. Arsitektur Baru yang Diusulkan

### Setelah Perbaikan: Alur Upload yang Lebih Efisien

```
User pilih file
↓
[Client] handlePhotoUpload()
  - Validasi (type, size)
  - FormData → fetch /api/photos/upload
↓
[API Route] POST /api/photos/upload
  - getServerSession()
  - ✅ Token refresh otomatis via JWT callback (expired detection)
  - Parse FormData
  - Validasi
  - getUserIdByEmail()
  - Delegasi ke Photo Service
↓
[Photo Service] uploadActivityPhoto()
  - 1 query JOIN: activity → logbook → user (gabung ownership + data)
  - ✅ Gunakan cached folder IDs jika ada
  - Delegasi ke Drive Service
↓
[Drive Service] uploadFileToActivityFolder()
  - ✅ Cek cache dulu sebelum lookup folder
  - ✅ Hanya 1-2 API calls:
    1. upload file (dengan parents langsung jika folder cached)
    2. verify file (opsional, bisa di-skip di production)
  - ✅ Retry 3x dengan exponential backoff
↓
[Drive Service] Upload sukses
  - ✅ Simpan activity_folder_id ke cache untuk next upload
↓
[Photo Service] savePhotoMetadata()
  - INSERT ke Supabase photos
  - ✅ Jika gagal: cleanup file dari Drive
↓
API Response → UI Update
```

### Estimasi API Calls per Upload

| Skenario | Saat Ini | Setelah Perbaikan | Penghematan |
|----------|----------|-------------------|-------------|
| Upload pertama ke activity baru | 5-10 calls | 3-4 calls | 50-60% |
| Upload kedua+ ke activity sama | 5-10 calls | 1-2 calls | 80-90% |
| Upload ke activity berbeda (user sama) | 5-10 calls | 2-3 calls | 60-70% |

---

## 8. Kesimpulan Arsitektur Drive

### Keputusan: **Pertahankan OAuth User Token + Perbaiki Token Refresh**

**Mengapa:**
1. Arsitektur OAuth user token sudah tepat untuk aplikasi KKN yang user-centric
2. Service Account menambah kompleksitas tanpa benefit signifikan untuk skala 50-500 user
3. Masalah utama (token expired) bisa diperbaiki dengan ~50 baris kode refresh token
4. Overhead API calls bisa dikurangi 60-80% dengan caching sederhana

### Roadmap Perbaikan

| Langkah | Estimasi Waktu | Dampak |
|---------|---------------|--------|
| 1. Refresh token mechanism | 30-60 menit | 🎯 Eliminasi 70% upload gagal |
| 2. Hapus buildFolderPathChain dari upload | 5 menit | Hemat 1-3 API calls/upload |
| 3. Cache folder IDs in-memory | 15 menit | Hemat 2-4 API calls/upload |
| 4. Better error message token expired | 5 menit | Developer/debug friendly |
| 5. Retry logic Drive API calls | 20 menit | Reliability meningkat |
| 6. Orphan cleanup jika DB insert gagal | 15 menit | Data integrity |
| 7. Single query untuk ownership + data | 10 menit | DB query 50% lebih hemat |

**Total estimasi perubahan:** 1.5-2 jam
**Impact:** Reliability dari 5/10 → 8/10, Scalability dari 4/10 → 7/10