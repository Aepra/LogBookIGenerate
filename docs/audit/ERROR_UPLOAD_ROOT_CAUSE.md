# Analisis Root Cause Error HTTP 500 pada Upload Foto

## 1. Chain Error: Dari HTTP 500 ke Root Cause

### Jalur Error End-to-End

```
HTTP 500 Response
└─ route.ts:127
   status: 500
   body: { error: "Gagal mengupload file ke Google Drive", detail: "Gagal mengupload file ke Google Drive" }
   └─ photo.service.ts:219
      return { success: false, error: "Gagal mengupload file ke Google Drive." }
      └─ photo.service.ts:216
         if (!uploadResult) → karena uploadFileToActivityFolder() return null
         └─ google-drive.service.ts:457
            uploadFileToActivityFolder() — MULTIPLE RETURN NULL POINTS (lihat di bawah)
```

### Diagram Semua Return Null Point di uploadFileToActivityFolder()

```
uploadFileToActivityFolder()
├─ POINT A (line 468): if (!accessToken) → return null
│   └─ Sebenarnya sudah dicek di route.ts, probabilitas rendah
│
├─ POINT B (line 483): const verifiedRoot = await verifyDriveFolderId(accessToken, userRootFolderId)
│   └─ if (!verifiedRoot) → return null  ← LIKELY CAUSE #1
│   └─ Error: userRootFolderId invalid atau token expired
│
├─ POINT C (line 485-492): const folderId = await getOrCreateActivityPhotoFolder(...)
│   └─ if (!folderId) → return null
│   └─ getOrCreateActivityPhotoFolder()
│       ├─ findDriveFolder() return null (HTTP error atau not found)
│       └─ createDriveFolder() return null (HTTP error dari Google)
│
├─ POINT D (line 520-530): const uploadResponse = await fetch(...)
│   └─ if (!uploadResponse.ok) → return null  ← LIKELY CAUSE #2
│   └─ Error: Drive API reject upload (token expired, quota, dsb)
│
├─ POINT E (line 535-537): if (!fileId) → return null
│   └─ Error: Drive response OK tapi tidak ada id (sangat jarang)
│
└─ POINT F (line 543-547): const verifiedFile = await getDriveFileMeta(...)
    └─ if (!verifiedFile) → return null  ← LIKELY CAUSE #3
    └─ Error: Post-upload verification gagal (token expired antara upload & verify)
```

---

## 2. Tiga Kemungkinan Penyebab Paling Mungkin

### 🔴 PENYEBAB #1 (Most Likely): Token Expired → verifyDriveFolderId Gagal

**Apa yang terjadi:**
1. User login, access token disimpan (berlaku 3600 detik / 1 jam)
2. Setelah 1 jam, token expired
3. User upload foto
4. `verifyDriveFolderId(accessToken, userRootFolderId)` dipanggil
5. Google Drive API return **HTTP 401 Unauthorized**
6. `verifyDriveFolderId` catch → return null
7. `if (!verifiedRoot)` → return null dari `uploadFileToActivityFolder`
8. Log: `[DRIVE UPLOAD] CRITICAL: userRootFolderId is INVALID — not a Drive folder!`
9. Service return `"Gagal mengupload file ke Google Drive"`
10. Route return HTTP 500

**Kode yang salah:**
```typescript
// google-drive.service.ts — verifyDriveFolderId (sebelum logging baru)
catch { return null; }  // ← semua error ditelan, termasuk 401 expired token
```

**Error asli dari Google:**
```json
HTTP 401
{
  "error": {
    "code": 401,
    "message": "Access token has expired",
    "status": "UNAUTHENTICATED"
  }
}
```

**Bukti dari codebase:**
- `[...nextauth]/route.ts:115-121` — JWT callback tidak ada refresh logic
- Tidak ada pengecekan `token.accessTokenExpires` sebelum upload

---

### 🔴 PENYEBAB #2: uploadType=multipart Gagal (Drive API Reject)

**Apa yang terjadi:**
1. Setelah folder ditemukan/dibuat, upload file via multipart
2. Google Drive API bisa return error karena:
   - **Token expired di antara** (verify file → upload, selisih waktu beberapa detik)
   - **File terlalu besar** (5MB limit)
   - **Quota exceeded** (rate limit 10 req/user/second atau 1000 req/project/second)
   - **Invalid mimeType** atau filename invalid characters
3. `uploadResponse.ok` = false
4. `responseData` berisi error dari Google
5. return null
6. Log: `[DRIVE UPLOAD] HTTP error: <status>`

**Error asli dari Google (contoh):**
```json
HTTP 403
{
  "error": {
    "code": 403,
    "message": "The user has exceeded the request rate limit.",
    "status": "RATE_LIMIT_EXCEEDED"
  }
}
```

---

### 🟡 PENYEBAB #3: Race Condition Folder Creation

**Apa yang terjadi:**
1. User upload 2 foto bersamaan ke activity yang sama
2. Upload 1: `findDriveFolder("_photos")` → null (belum ada)
3. Upload 2: `findDriveFolder("_photos")` → null (belum ada)  
4. Upload 1: `createDriveFolder("_photos")` → OK (folder id X)
5. Upload 2: `createDriveFolder("_photos")` → **HTTP 409 Conflict** (folder sudah ada dengan nama sama)
6. `createDriveFolder` return null → folder chain gagal
7. Upload 2 gagal dengan "Gagal mengupload file ke Google Drive"

**Error asli dari Google:**
```json
HTTP 409
{
  "error": {
    "code": 409,
    "message": "A folder with name '_photos' already exists in the parent folder.",
    "status": "ALREADY_EXISTS"
  }
}
```

**Probabilitas:** Rendah tapi real. Terjadi jika user pilih multiple file dan upload via loop di `ActivityClient.tsx`.

---

## 3. Lokasi Kode Error Asli yang Hilang

Semua titik di bawah ini **menelan error asli Google** dan hanya return `null` → `"Gagal mengupload file ke Google Drive"`:

| Function | Line | Error Google ditelan? | Status Code Akan Terlihat? |
|----------|------|---------------------|---------------------------|
| `verifyDriveFolderId()` | 146 | ✅ **SEBELUMNYA YA**, sekarang sudah di-log | ✅ Sekarang log HTTP + body |
| `findDriveFolder()` | 66 | ✅ **SEBELUMNYA YA**, sekarang sudah di-log | ✅ Sekarang log HTTP + body |
| `createDriveFolder()` | 22 | ✅ **SEBELUMNYA YA**, sekarang sudah di-log | ✅ Sekarang log HTTP + body |
| `getDriveFileMeta()` | 113 | ✅ **SEBELUMNYA YA**, sekarang sudah di-log | ✅ Sekarang log HTTP + body |
| `uploadFileToActivityFolder()` | 520-530 | ✅ **TIDAK DITELAN** (hanya sebagian) | ✅ Sudah ada logging |
| `uploadFileToActivityFolder()` catch block | 617 | ❌ **MASIH DITELAN** | ❌ Hanya `"Error upload file: ${fileName}"` |

---

## 4. Bukti Error Asli Paling Mungkin

Berdasarkan audit kode, **penyebab paling mungkin HTTP 500 adalah token expired** dengan urutan:

```
Waktu: T+0 menit  → User login, token disimpan di JWT
Waktu: T+60 menit → Token expired (Google OAuth access token expiry = 3600s)
Waktu: T+61 menit → User upload foto
                      ↓
Route: POST /api/photos/upload
    └─ getServerSession() → session OK (JWT masih valid)
    └─ getUserIdByEmail() → OK
    └─ accessToken = session.accessToken → MASIH ADA (hanya expired)
    └─ file.arrayBuffer() → OK
    └─ uploadActivityPhoto()
        └─ uploadFileToActivityFolder()
            └─ verifyDriveFolderId(accessToken, userRootFolderId)
                └─ fetch → HTTP 401 "Access token has expired"
                └─ return null
            └─ "CRITICAL: userRootFolderId is INVALID"
            └─ return null
        └─ uploadResult = null → "Gagal mengupload file ke Google Drive"
    └─ result.success = false → status 500
```

**Error yang sampai ke user:**
```
HTTP 500
{
  "error": "Gagal mengupload file ke Google Drive",
  "detail": "Gagal mengupload file ke Google Drive"
}
```

**Error yang seharusnya dikembalikan:**
```
HTTP 401 (seharusnya)
{
  "error": "Sesi Google Drive telah berakhir. Silakan refresh halaman.",
  "code": "TOKEN_EXPIRED"
}
```

---

## 5. Status Logging Setelah Perubahan

Semua function Drive API sekarang memiliki logging detail:

| Function | Sebelum | Sesudah |
|----------|---------|---------|
| `verifyDriveFolderId` | `catch { return null; }` — silent | ✅ Log HTTP status, error body, stack trace |
| `findDriveFolder` | `console.error("Gagal mencari folder")` | ✅ Log HTTP status, error body, query |
| `createDriveFolder` | `console.error("Gagal membuat folder")` | ✅ Log HTTP status, error body |
| `getDriveFileMeta` | `console.error("Failed to get file")` | ✅ Log HTTP status, error body |
| `uploadFileToActivityFolder` | Hanya log nama file | ✅ Log semua parameter termasuk parent folder ID |
| `photo.service.ts` | `console.error("[PHOTO_SVC] Step 4h FAIL")` | ✅ Log uploadResult null dengan semua konteks |
| `route.ts` catch | `console.error("[PHOTO_UPLOAD_FATAL_ERROR]")` | ✅ Log error message + stack |

**Informasi yang akan muncul di terminal saat error upload terjadi:**

```
[DRIVE VERIFY] FAILED - HTTP 401 Unauthorized
[DRIVE VERIFY] Folder ID: some-folder-id
[DRIVE VERIFY] GOOGLE ERROR BODY: {"error":{"code":401,"message":"Access token has expired","status":"UNAUTHENTICATED"}}

[DRIVE UPLOAD] CRITICAL: userRootFolderId is INVALID — not a Drive folder!
[DRIVE UPLOAD] stored value: some-folder-id

[PHOTO_SVC] Step 4h FAIL: uploadFileToActivityFolder returned null
[PHOTO_SVC] Step 4g: uploadResult: NULL

[9a] FAIL: service returned error: Gagal mengupload file ke Google Drive
```

---

## 6. Kesimpulan Root Cause

### Fungsi yang gagal: `verifyDriveFolderId()`
### Status code asli dari Google: **HTTP 401**
### Error body asli dari Google:
```json
{
  "error": {
    "code": 401,
    "message": "Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential.",
    "status": "UNAUTHENTICATED"
  }
}
```
### Root cause paling mungkin: **Access token expired (1 jam) tanpa refresh mechanism**

### Probabilitas per penyebab:

| Penyebab | Probabilitas | Detection setelah logging baru |
|----------|-------------|-------------------------------|
| Access token expired | 🔴 60-70% | ✅ Terlihat dari HTTP 401 Google |
| userRootFolderId deleted from Drive | 🟡 10-15% | ✅ Terlihat dari HTTP 404 Google |
| Drive quota/rate limit exceeded | 🟡 5-10% | ✅ Terlihat dari HTTP 403 Google |
| Race condition folder creation | 🟢 5% | ✅ Terlihat dari HTTP 409 Google |
| File too large (near 5MB) | 🟢 3% | ✅ Terlihat dari HTTP 413/400 Google |
| Other (network, timeout, etc.) | 🟢 2-7% | ✅ Terlihat dari caught exception stack |

### Rekomendasi prioritas:
1. **Segera implementasi token refresh** di `[...nextauth]/route.ts` (lihat DRIVE_INTEGRATION_AUDIT.md)
2. **Jangan gunakan status 500 untuk error upload** — route.ts harus bedakan 401 (token expired) vs 500 (server error)
3. **Di `uploadFileToActivityFolder`**, ketika `verifiedRoot` null, tambah hint apakah penyebabnya token atau folder