# Audit Alur Upload Foto ke Google Drive

> **Status:** v2 refactored — 23 Juni 2026
> **Perubahan besar v2:**
> - **Folder key:** `logbookId` (bukan `logbookTitle`) — immutable, unique, no sanitization needed
> - **Cache layer:** Pluggable `ICache` interface (MapCache dev, Redis-ready production)
> - **Token refresh:** On-demand via `refreshToken` callback di setiap Drive API call
> - **Retry:** 2 retries dengan exponential backoff (500ms, 1000ms) untuk 429/5xx
> - **TraceId:** End-to-end observability via `TraceContext`
> - **Structured errors:** Kode error, step, retryable flag
> - **Max upload count:** 10 file per request

---

## 1. Flow Upload Aktual — v2

```
User (components/ActivityClient.tsx)
│
├─ 1. handleFileSelect() → handlePhotoUpload() per file
│   ├─ Validasi client: JPEG/PNG/WebP, max 5MB
│   └─ fetch POST /api/photos/upload → FormData { activity_id, file }
│
├─ 2. API Route: POST /api/photos/upload [app/api/photos/upload/route.ts]
│   ├─ 2a. createTraceContext() → [UPLOAD:{traceId}] step logging dimulai
│   ├─ 2b. getServerSession() → validasi auth & email
│   ├─ 2c. request.formData() → parse activityId + files[]
│   ├─ 2d. Validasi server: type, size (max 5MB), count (max 10 file)
│   ├─ 2e. getUserIdByEmail() → resolve userId
│   ├─ 2f. Cek accessToken + accessTokenExpires + refreshToken tersedia
│   ├─ 2g. Buat refreshTokenCallback() → wrap lib/token-refresh.ts
│   ├─ 2h. file.arrayBuffer() → read file buffer
│   └─ 2i. uploadActivityPhoto(trace, ..., refreshTokenCallback)
│
├─ 3. photo.service.ts: uploadActivityPhoto() [services/photo.service.ts:114]
│   ├─ 3a. Query: activities (select logbook_id) WHERE id = activityId
│   │     → logbookId
│   ├─ 3b. Query: logbooks (select title, user_id) WHERE id = logbookId
│   │     → verify user_id === userId (ownership)
│   ├─ 3c. Query: users (select drive_folder_id, email) WHERE id = userId
│   │     → userRootFolderId
│   └─ 3d. uploadFileToActivityFolder({ trace, accessToken, refreshToken,
│           fileBuffer, fileName, mimeType, userRootFolderId, logbookId })
│
├─ 4. google-drive.service.ts: uploadFileToActivityFolder() — v2
│   │
│   │  PARAM: { trace, accessToken, refreshToken, fileBuffer, fileName,
│   │           mimeType, userRootFolderId, logbookId }
│   │
│   ├─ 4a. Validate: file size ≤ 5MB, sanitize file name
│   │
│   ├─ 4b. resolvePhotoFolder(userRootFolderId, logbookId)
│   │  ├── Cache: "drive:verifiedRoot:{userRootFolderId}"
│   │  │   ├── MISS → verifyDriveFolderId() via driveFetch() → 1 API call
│   │  │   │         (includes retry + token refresh if 401)
│   │  │   └── HIT  → skip
│   │  │
│   │  ├── Cache: "drive:imageRoot:{userRootFolderId}"
│   │  │   ├── MISS → findDriveFolder("logbookidImage", root) via driveFetch()
│   │  │   │         └── NOT FOUND → createDriveFolder(...) via driveFetch()
│   │  │   └── HIT  → skip
│   │  │
│   │  └── Cache: "drive:logbookFolder:{root}:{logbookId}"
│   │      ├── MISS → findDriveFolder(logbookId, imageRoot) via driveFetch()
│   │      │         └── NOT FOUND → createDriveFolder(logbookId, ...) via driveFetch()
│   │      └── HIT  → skip
│   │
│   ├─ 4c. Build multipart/related boundary metadata + binary → Uint8Array
│   │
│   ├─ 4d. UPLOAD: fetch POST upload/drive/v3/files?uploadType=multipart
│   │     ├── STATUS 200 → parse { id, webViewLink }
│   │     ├── STATUS 401 → refreshToken callback → retry with new token
│   │     ├── STATUS 429 → retry (max 2: 500ms, 1000ms)
│   │     ├── STATUS 5xx → retry (max 2: 500ms, 1000ms)
│   │     └── STATUS 4xx (other) → immediate error
│   │
│   └─ 4e. POST-UPLOAD VERIFICATION: getDriveFileMeta(fileId)
│         └── Verify file exists + correct parent folder
│
├─ 5. photo.service.ts: savePhotoMetadata() [services/photo.service.ts:63]
│   └── INSERT INTO photos (activity_id, google_file_id, google_drive_url)
│
├─ 6. API Route → Response JSON with traceId
│   ├── SUCCESS → 201: { photo, message, traceId }
│   └── ERROR   → { code, message, step, retryable }
│
└─ 7. UI: setPhotosByActivity() → update state → re-render thumbnail
    └── Thumbnail: https://drive.google.com/thumbnail?id={google_file_id}&sz=w100-h100
```

---

## 2. File dan Function yang Terlibat

### Frontend / Komponen

| File | Function | Baris | Peran |
|------|----------|-------|-------|
| `components/ActivityClient.tsx` | `handleFileSelect()` | 192 | Handler onChange input file, trigger upload per file |
| `components/ActivityClient.tsx` | `handlePhotoUpload()` | 100 | Validasi client, kirim FormData ke API |
| `components/ActivityClient.tsx` | `getPhotosForActivity()` | 265 | Guard untuk akses photosByActivity state |

### API Route

| File | Function | Baris | Peran |
|------|----------|-------|-------|
| `app/api/photos/upload/route.ts` | `POST()` | 7 | API endpoint: auth, validasi, delegasi ke service |
| `app/api/auth/[...nextauth]/route.ts` | `signIn()` callback | - | Setup `drive_folder_id` saat login pertama |
| `app/api/auth/[...nextauth]/route.ts` | `jwt()` callback | - | Simpan accessToken + refreshToken ke JWT |
| `app/api/auth/[...nextauth]/route.ts` | `session()` callback | - | Expose accessToken ke session |

### Service Layer

| File | Function | Baris | Peran |
|------|----------|-------|-------|
| `services/photo.service.ts` | `uploadActivityPhoto()` | 142 | Orkestrasi: ownership → Drive → DB |
| `services/photo.service.ts` | `verifyActivityOwnership()` | 31 | Validasi activity → logbook → user_id |
| `services/photo.service.ts` | `savePhotoMetadata()` | 63 | INSERT ke Supabase photos table |
| `services/photo.service.ts` | `getPhotosByActivityIds()` | 107 | Batch fetch foto untuk banyak activity |
| `services/google-drive.service.ts` | `uploadFileToActivityFolder()` | ~420 | Upload file ke Drive + folder chain + verifikasi |
| `services/google-drive.service.ts` | `getOrCreateLogbookImageSubfolder()` | ~340 | Find/create: `logbookidImage/{logbookTitle}` |
| `services/google-drive.service.ts` | `findDriveFolder()` | ~66 | Search folder by name & parent di Drive |
| `services/google-drive.service.ts` | `createDriveFolder()` | ~22 | Buat folder baru di Drive |
| `services/google-drive.service.ts` | `verifyDriveFolderId()` | ~146 | Validasi folder ID benar-benar folder Drive |
| `services/google-drive.service.ts` | `getDriveFileMeta()` | ~113 | Verifikasi post-upload file existence |
| `services/google-drive.service.ts` | `getOrCreateUserRootFolder()` | ~250 | Buat/dapatkan folder root user `LogBook.ID/{email}` |

### Database / Utility

| File | Function | Baris | Peran |
|------|----------|-------|-------|
| `lib/user.ts` | `getUserIdByEmail()` | - | Lookup user ID dari email |
| `lib/supabase-server.ts` | `supabaseAdmin` | 6 | Supabase admin client (service_role) |
| `types/next-auth.d.ts` | Type augmentation | - | Deklarasi tipe `accessToken` di Session & JWT |

---

## 3. Temuan Audit

### 3.1 Tahap Client-side: File Selection & Validasi

**Apa yang dilakukan:**
- User memilih file via `<input type="file" multiple>` (line 467)
- `handleFileSelect()` (line 192) loop setiap file dan panggil `handlePhotoUpload()`
- `handlePhotoUpload()` (line 100) validasi client: tipe file (JPEG/PNG/WebP) dan ukuran (max 5MB)
- Kirim FormData via `fetch` ke `/api/photos/upload`

**Apakah sudah benar:** ✅ Sebagian besar benar

**Potensi masalah:**
| # | Masalah | Detail | Risiko |
|---|---------|--------|--------|
| 1 | **Duplicate validation** | Client dan server validasi tipe & size sama. Jika mismatch, error tidak konsisten. | Rendah |
| 2 | **Upload sequential, not parallel** | `for` loop satu-per-satu. File ke-2 menunggu file ke-1 selesai. | Rendah |
| 3 | **No upload progress bar** | Tidak ada visual progress untuk file besar (misal 4.9MB). | Rendah |

### 3.2 Tahap API Route: Session & Auth — v2

**Apa yang dilakukan:**
- `getServerSession(authOptions)` ambil session
- Cek `session?.user?.email`, `session.accessToken`, `session.refreshToken`
- Buat `refreshTokenCallback()` yang memanggil `refreshAccessToken()` dari `lib/token-refresh.ts`
- Callback dikirim ke service layer → Drive service memanggilnya otomatis saat 401

**Apakah sudah benar:** ✅ Token refresh sudah diimplementasikan

**Potensi masalah:**
| # | Masalah | Detail | Risiko |
|---|---------|--------|--------|
| 1 | **Refresh token tidak ada (first-time login)** | Jika user login tanpa `access_type=offline`, refreshToken tidak diberikan Google. | **Sedang** |
| 2 | **Refresh token revoked** | User mencabut akses via Google Account → `invalid_grant` error. | Rendah |

### 3.3 Tahap Drive Folder Chain — v2 (logbookId based)

**Apa yang dilakukan:**
- `resolvePhotoFolder()` mencari folder `logbookidImage` di root user (via `ICache`)
- Kalau tidak ada → buat (via `driveFetch()` with retry + token refresh)
- Cari folder dengan `logbookId` di dalam `logbookidImage`
- Kalau tidak ada → buat

**Apakah sudah benar:** ✅ v2 improvements applied

**Potensi masalah:**
| # | Masalah | Detail | Risiko |
|---|---------|--------|--------|
| 1 | **Cache in-memory default** | Default `MapCache` hilang saat restart. Tapi folder ID immutable, jadi hanya 1 extra find. | Rendah |
| 2 | **Race condition create** | Jika 2 request bersamaan create folder yang sama, salah satu dapat error. | Rendah |
| 3 | **Migration path** | Folder lama bernama `{logbookTitle}` tidak otomatis dipindah ke `{logbookId}`. Upload baru akan buat folder baru. | **Sedang** |

### 3.4 Tahap Google Drive Multipart Upload — v2

**Apa yang dilakukan:**
- Build multipart/related boundary (metadata + file binary)
- POST ke `upload/drive/v3/files?uploadType=multipart`
- 401 → auto refresh token → retry
- 429/5xx → retry 2x (500ms, 1000ms exponential backoff)
- Post-upload verification via `getDriveFileMeta()`

**Apakah sudah benar:** ✅ v2 improvements applied

**Potensi masalah:**
| # | Masalah | Detail | Risiko |
|---|---------|--------|--------|
| 1 | **Memory double copy** | ArrayBuffer → Uint8Array combination. File 5MB = 10MB+ memory. | Sedang |
| 2 | **Streaming belum digunakan** | `driveFetch` bisa dioptimasi pakai streaming untuk file besar. | Rendah |

### 3.5 Tahap Post-upload Verification

**Apa yang dilakukan:**
- `getDriveFileMeta()` verifikasi file ada di Drive
- Cek `parents` array cocok dengan target folder

**Apakah sudah benar:** ✅ Sangat baik

**Potensi masalah:**
| # | Masalah | Detail | Risiko |
|---|---------|--------|--------|
| 1 | **1 extra API call per upload** | Verifikasi = 1 extra Drive API call. | Rendah |

### 3.6 Tahap Database Insert

**Apa yang dilakukan:**
- `savePhotoMetadata()` INSERT ke `photos` table
- Kolom: `activity_id`, `google_file_id`, `google_drive_url`

**Apakah sudah benar:** ✅ Benar

**Potensi masalah:**
| # | Masalah | Detail | Risiko |
|---|---------|--------|--------|
| 1 | **Tidak ada cleanup orphan** | Jika insert DB gagal, file di Drive sudah terupload tapi tidak tercatat. | Sedang |
| 2 | **Tidak ada unique constraint** | Tidak cegah duplicate file_id. | Rendah |

---

## 4. Evaluasi Arsitektur — v2

### Skor: **Cukup Baik → Baik** (7.5/10)

### Kelebihan v2
1. **Layered architecture bersih** — UI → API Route → Photo Service → Drive Service
2. **Drive logic 100% terisolasi** di `google-drive.service.ts`
3. **Hard validation post-upload** — file diverifikasi existence + parent folder
4. **TraceId logging** — `[UPLOAD:{traceId}]` end-to-end dengan step labels
5. **Token refresh on-demand** — via `refreshToken` callback di semua Drive API calls
6. **Retry with backoff** — 2 retries (500ms, 1000ms) untuk 429/5xx
7. **Structured errors** — `{ code, message, step, retryable }` untuk frontend handling
8. **Pluggable cache** — `ICache` interface, `MapCache` dev, Redis-ready production
9. **Folder key immutable** — `logbookId` instead of `logbookTitle` (no sanitization, unique)

### Kekurangan v2
1. **No orphan cleanup** — jika DB insert gagal setelah Drive upload sukses, file orphan tetap ada
2. **Memory double copy** — ArrayBuffer → Uint8Array duplicate (10MB+ untuk file 5MB)
3. **No streaming** — `driveFetch` membaca full body sebelum return
4. **Sequential upload** — frontend loop satu-per-satu, tidak parallel
5. **No upload progress** — tidak ada progress bar di UI

### 5 Perbaikan Prioritas v2

1. **(MEDIUM) Orphan cleanup** — jika `savePhotoMetadata()` gagal, hapus file dari Drive via `delete()` API
2. **(MEDIUM) Streaming untuk upload** — gunakan ReadableStream daripada ArrayBuffer untuk file besar
3. **(LOW) Parallel upload** — `Promise.allSettled()` untuk upload multiple file di frontend
4. **(LOW) Upload progress** — gunakan `XMLHttpRequest` upload progress event
5. **(LOW) Redis cache** — ganti `MapCache` dengan Redis untuk production (shared cache, persist across restarts)

### Skor v2

| Aspek | Skor v2 | Alasan |
|-------|---------|--------|
| Arsitektur | 8/10 | Layer bersih, pluggable cache, structured errors, immutable folder key |
| Reliability | 7/10 | Token refresh + retry + verification, tapi orphan cleanup belum ada |
| Maintainability | 9/10 | Kode terstruktur, trace logging, types shared, 0 TypeScript errors |
| Scalability | 6/10 | Cache kurangi API call, tapi sequential upload + memory double copy |

---

## 5. Potensi Penyebab Upload Gagal — v2

| # | Titik Gagal | Lokasi Kode | Penjelasan | Risiko |
|---|-------------|-------------|------------|--------|
| 1 | **Refresh token revoked/invalid** | `lib/token-refresh.ts:39-44` | `invalid_grant` — user mencabut akses atau refresh token expired | **Sedang** |
| 2 | **Supabase RLS policy block** | `photo.service.ts:146-156` | Service_role key bisa block jika RLS misconfigured | **Sedang** |
| 3 | **userRootFolderId null** | `photo.service.ts:179-185` | User tidak punya Drive folder (signIn callback gagal) | **Sedang** |
| 4 | **Drive folder dihapus manual** | `google-drive.service.ts:driveFetch()` | `verifyDriveFolderId` return null setelah cache miss, retry gagal | **Sedang** |
| 5 | **Google Drive rate limit** | `google-drive.service.ts:driveFetch()` | 4-5 API calls per upload, retry ke-3 kena 429 juga | **Sedang** |
| 6 | **Access token expired + refresh gagal** | `app/api/photos/upload/route.ts` + `lib/token-refresh.ts` | Callback return null, 401 terus setelah retry | **Sedang** |
| 7 | **Memory OOM untuk file besar >10MB** | `app/api/photos/upload/route.ts` + `google-drive.service.ts` | ArrayBuffer + multipart Uint8Array duplicate memory. Validasinya 5MB, tapi bisa bypass | **Rendah** |
| 8 | **File name terlalu panjang** | `google-drive.service.ts` | Google Drive batasi 255 karakter. File dengan nama >255 char bisa error create | **Rendah** |
| 9 | **Orphan file (Drive sukses, DB gagal)** | `photo.service.ts:198-206` | `savePhotoMetadata()` gagal → file Drive tetap ada tanpa metadata | **Sedang** |

---

## 6. Logging Audit

### Kondisi Saat Ini: ✅ Cukup Baik

| Layer | Prefix | Coverage |
|-------|--------|----------|
| UI | `[UI UPLOAD]`, `[UI UPLOAD RESPONSE]` | ✅ |
| API Route | `[1]`-`[10]` (numbered steps) | ✅ |
| Photo Service | `[PHOTO_SVC]` | ✅ Step-by-step + error |
| Drive Service | `[DRIVE UPLOAD]`, `[DRIVE CACHE]`, `[DRIVE FOLDER CHAIN]` | ✅ Detail |

### Kekurangan
1. **Tidak ada trace ID** — susah debug concurrent upload
2. **Tidak ada timing/duration** — tidak tahu berapa lama setiap Drive API call
3. **Tidak ada structured logging** — plain `console.log`, bukan JSON

### Rekomendasi
```typescript
// Trace ID
const uploadId = crypto.randomUUID();
console.log(`[UPLOAD:${uploadId}] start`);

// Timing
console.log(`[DRIVE UPLOAD] TIMING: ${performance.now() - start}ms`);

// Orphan detection
console.error("[ORPHAN] Drive file uploaded but DB insert failed. fileId:", fileId);
```

---

## 7. Folder Structure Google Drive — v2

```
LogBook.ID/{email}/
  ├── {logbookTitle}/              ← untuk export/docs (dibuat oleh createLogbook)
  └── logbookidImage/              ← folder foto terpusat
       └── {logbookId}/            ← folder per logbook (v2: logbookId, immutable)
            ├── foto1.jpg
            └── foto2.jpg
```

**Perubahan kunci v2:** Folder key dari `logbookTitle` (mutable) → `logbookId` (immutable).
- Tidak perlu sanitasi karakter khusus (title bisa mengandung `/`, `\`, `:` dll.)
- Unique — tidak konflik kalau judul sama
- Tidak perlu update folder kalau title berubah

**Cache strategy (ICache interface):**
| Cache Key | TTL | Tujuan |
|-----------|-----|--------|
| `drive:verifiedRoot:{userRootFolderId}` | 5 menit | Skip verifikasi root folder untuk setiap upload |
| `drive:imageRoot:{userRootFolderId}` | 5 menit | Skip find/create `logbookidImage` folder |
| `drive:logbookFolder:{root}:{logbookId}` | 5 menit | Skip find/create folder per logbook |
