# Audit Token Lifecycle: NextAuth + Google OAuth

## 1. Callback `jwt()` — Full Content

**File:** `app/api/auth/[...nextauth]/route.ts` line 115-121

```typescript
async jwt({ token, account }) {
  if (account) {
    token.accessToken = account.access_token;
    token.refreshToken = account.refresh_token;
    console.log("[NextAuth JWT] Token stored:", !!token.accessToken, "refresh:", !!token.refreshToken);
  }
  return token;
},
```

### Analisis Baris per Baris

| Baris | Kode | Masalah |
|-------|------|---------|
| 115 | `async jwt({ token, account })` | Parameter `account` hanya ada saat **first sign-in** atau **signIn() dipanggil ulang**. Semua request berikutnya: `account` = undefined. |
| 116 | `if (account) {` | Hanya berjalan sekali saat login. |
| 117 | `token.accessToken = account.access_token;` | ✅ Tersimpan. Tapi tidak pernah di-refresh. |
| 118 | `token.refreshToken = account.refresh_token;` | ✅ Tersimpan. Tapi tidak pernah digunakan. |
| 119 | `console.log(...)` | Log hanya muncul sekali. |
| 121 | `return token;` | **Token dikembalikan apa adanya. Tidak ada modifikasi.** |

### Yang TIDAK ADA di `jwt()` callback:

| Yang Hilang | Akibat |
|-------------|--------|
| ❌ `account.expires_at` tidak disimpan | Tidak tahu kapan token expired |
| ❌ `account.expires_in` tidak disimpan | Tidak bisa hitung waktu expiry |
| ❗ **`accessTokenExpires` tidak pernah dibuat/disimpan** | **Tidak ada cara untuk deteksi token expired** |
| ❌ `refreshAccessToken()` function tidak ada | Tidak ada mekanisme refresh |
| ❌ Cek `Date.now() < token.accessTokenExpires` tidak ada | Token tidak pernah diperiksa masa berlakunya |
| ❌ Conditional return untuk expired token tidak ada | Token expired = token tetap dipakai |

---

## 2. Callback `session()` — Full Content

**File:** `app/api/auth/[...nextauth]/route.ts` line 123-129

```typescript
async session({ session, token }) {
  return {
    ...session,
    accessToken: token.accessToken as string | undefined,
    refreshToken: token.refreshToken as string | undefined,
  };
},
```

### Analisis

| Aspek | Status | Masalah |
|-------|--------|---------|
| `accessToken` disalin dari JWT token | ✅ Ada | Tapi JWT token bisa sudah expired |
| Cek apakah token expired sebelum dikembalikan | ❌ **TIDAK ADA** | Session selalu mengembalikan token apa adanya |
| Cek `token.accessTokenExpires` | ❌ **TIDAK ADA** (field tidak ada) | Tidak bisa cek expiry |
| Mengembalikan undefined jika expired | ❌ **TIDAK ADA** | Session memberikan token expired ke upload route |
| Logging expiry status | ❌ **TIDAK ADA** | Developer tidak tahu token status |

---

## 3. Apakah `account.expires_at` Disimpan?

**Jawaban: TIDAK**

Google OAuth mengembalikan `expires_at` dan `expires_in` di response token. Tapi di `jwt()` callback (line 115-121):

```typescript
if (account) {
  token.accessToken = account.access_token;   // ✅ disimpan
  token.refreshToken = account.refresh_token;  // ✅ disimpan
  // ❌ account.expires_at → TIDAK DISIMPAN
  // ❌ account.expires_in  → TIDAK DISIMPAN
}
```

**Akibat:** Tidak ada informasi waktu expiry di JWT token. Setiap kali token dicek, tidak bisa tahu apakah masih valid atau sudah expired.

---

## 4. Apakah `account.refresh_token` Disimpan?

**Jawaban: YA**, di baris 118:
```typescript
token.refreshToken = account.refresh_token;
```

**Tapi:** TIDAK PERNAH DIGUNAKAN (lihat poin 6).

---

## 5. Apakah Token Pernah Direfresh?

**Jawaban: TIDAK PERNAH**

Tidak ada satu baris kode pun yang memanggil Google OAuth refresh endpoint (`https://oauth2.googleapis.com/token`). Tidak ada `refreshAccessToken()` function.

Bukti:
- Seluruh file `[...nextauth]/route.ts` (135 baris) — tidak ada function `refreshAccessToken`
- Seluruh codebase — tidak ada import atau panggilan ke refresh endpoint
- Satu-satunya kode yang menyentuh token adalah:
  - `jwt()` callback: menyimpan token
  - `session()` callback: meneruskan token ke session
  - `upload/route.ts`: membaca token dari session

---

## 6. Apakah `refreshAccessToken()` Sudah Ada?

**Jawaban: TIDAK**

Tidak ada function dengan nama `refreshAccessToken` di seluruh codebase.

```bash
# Hasil pencarian: no matches found
```

---

## 7. Apakah `accessTokenExpires` Disimpan di JWT?

**Jawaban: TIDAK**

Di `jwt()` callback hanya ada:
```typescript
token.accessToken   = account.access_token;
token.refreshToken  = account.refresh_token;
```

Tidak ada:
```typescript
// ❌ Tidak ada di codebase
token.accessTokenExpires = Date.now() + (account.expires_in as number) * 1000;
```

**Cek tipe JWT di `types/next-auth.d.ts`:**

```typescript
// types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
  }
}
```

**Hanya ada 2 field:** `accessToken` dan `refreshToken`. **Tidak ada `accessTokenExpires`.**

---

## 8. Apakah Session Selalu Mengembalikan Token Lama Walaupun Sudah Expired?

**Jawaban: YA**

Flow-nya:

```
[1] Login → Google return access_token (valid 1 jam)
                ↓
[2] jwt() callback → menyimpan accessToken & refreshToken di JWT
                ↓
[3] session() callback → membaca accessToken dari JWT → dikembalikan ke client
                ↓
[4] 1 jam kemudian → accessToken SUDAH EXPIRED
                ↓
[5] User upload foto → getServerSession() dipanggil
                ↓
[6] NextAuth membaca JWT dari cookie
                ↓
[7] jwt() callback dipanggil LAGI → tapi account = undefined
                ↓
    → Token LAMA dikembalikan (masih berisi accessToken yang EXPIRED)
    → Tidak ada pengecekan expiry
    → Tidak ada refresh
                ↓
[8] session() callback → accessToken EXPIRED dikembalikan ke upload route
                ↓
[9] upload route → accessToken dikirim ke Google Drive API
                ↓
[10] Google → HTTP 401 "Access token has expired"
```

**Bukti di `jwt()` callback:**
```typescript
async jwt({ token, account }) {
  if (account) {            // ← Hanya true saat login
    token.accessToken = account.access_token;
    token.refreshToken = account.refresh_token;
  }
  return token;              // ← Saat account undefined, token LAMA dikembalikan tanpa perubahan
},
```

Setiap kali JWT callback dipanggil (setiap request API), `account` adalah `undefined`. Token lama langsung dikembalikan. Jika token sudah expired, tetap dikembalikan.

---

## 9. Apakah Google Hanya Mengirim `refresh_token` Saat Login Pertama?

**Jawaban: YA — ini perilaku Google OAuth**

| Login ke- | Google mengirim `refresh_token`? |
|-----------|-------------------------------|
| Pertama | ✅ **YA** (karena `access_type: "offline"`) |
| Kedua (masih dalam session valid) | ❌ Tidak perlu login lagi (session masih valid) |
| Setelah session expired / logout | ✅ **YA** (karena sudah ada `prompt: "consent"` di authorization params) |

**Kode terkait:**
```typescript
authorization: {
  params: {
    prompt: "consent",       // Memaksa consent screen setiap login
    access_type: "offline",  // Meminta refresh token
    response_type: "code",
    scope: "...",
  },
},
```

**Namun:** `prompt: "consent"` berarti user harus klik "Allow" setiap login. Ini kelebihan (dapat refresh_token setiap login) tapi juga kekurangan (user experience buruk — setiap login harus approve ulang).

**Kondisi `refresh_token` menjadi `undefined`:**
1. User revoke akses aplikasi di Google Account settings → refresh token jadi invalid
2. Refresh token sudah 6 bulan tidak digunakan → Google hapus refresh token
3. User ganti password → semua refresh token di-revoke
4. Refresh token sudah digunakan > 50 kali → beberapa provider batasi

---

## 10. Flow Lengkap: Login → JWT → Session → Upload Route

```
LOGIN FLOW:
═══════════

Browser                      NextAuth                      Google OAuth              Supabase              Google Drive
  │                            │                             │                        │                      │
  │  [Login with Google]       │                             │                        │                      │
  │───────────────────────────►│                             │                        │                      │
  │                            │  [Authorization Request]    │                        │                      │
  │                            │────────────────────────────►│                        │                      │
  │                            │  [Authorization Code]       │                        │                      │
  │                            │◄────────────────────────────│                        │                      │
  │                            │                             │                        │                      │
  │                            │  [Exchange code for token]  │                        │                      │
  │                            │────────────────────────────►│                        │                      │
  │                            │  [access_token              │                        │                      │
  │                            │   refresh_token             │                        │                      │
  │                            │   expires_in: 3600          │                        │                      │
  │                            │   expires_at: <timestamp>]  │                        │                      │
  │                            │◄────────────────────────────│                        │                      │
  │                            │                             │                        │                      │
  │                            │  [signIn callback]          │                        │                      │
  │                            │  ┌─ Cek user di DB          │                        │                      │
  │                            │  └─ Buat/update user        │──────────────────────►│                      │
  │                            │                             │                        │                      │
  │                            │  [getOrCreateUserRootFolder]│                        │                      │
  │                            │─────────────────────────────────────────────────────────────────────────►│
  │                            │  [folder id]               │                        │                      │
  │                            │◄─────────────────────────────────────────────────────────────────────────│
  │                            │                             │                        │                      │
  │                            │  [jwt() callback]           │                        │                      │
  │                            │  ┌─ accessToken    = ✅     │                        │                      │
  │                            │  ├─ refreshToken   = ✅     │                        │                      │
  │                            │  ├─ expires_at     = ❌     │                        │                      │
  │                            │  └─ expires_in     = ❌     │                        │                      │
  │                            │                             │                        │                      │
  │                            │  [session() callback]       │                        │                      │
  │                            │  ┌─ accessToken dari JWT    │                        │                      │
  │                            │  └─ refreshToken dari JWT   │                        │                      │
  │                            │                             │                        │                      │
  │  [Session JWT Cookie]      │                             │                        │                      │
  │◄───────────────────────────│                             │                        │                      │
  │                            │                             │                        │                      │
  │  ✅ LOGIN COMPLETE         │                             │                        │                      │
  │    accessToken valid       │                             │                        │                      │
  │    expires in: 1 jam       │                             │                        │                      │
  │                            │                             │                        │                      │

UPLOAD FLOW (60 menit kemudian — TOKEN EXPIRED):
═══════════════

  │                            │                             │                        │                      │
  │  [Upload Foto]             │                             │                        │                      │
  │───────────────────────────►│                             │                        │                      │
  │                            │  [getServerSession()]       │                        │                      │
  │                            │  → baca JWT dari cookie     │                        │                      │
  │                            │                             │                        │                      │
  │                            │  [jwt() callback panggil]   │                        │                      │
  │                            │  → account = undefined      │                        │                      │
  │                            │  → TOKEN LAMA DIKEMBALIKAN  │                        │                      │
  │                            │  → TIDAK ADA CEK EXPIRY     │                        │                      │
  │                            │  → TIDAK ADA REFRESH        │                        │                      │
  │                            │                             │                        │                      │
  │                            │  [session() callback]       │                        │                      │
  │                            │  → accessToken = STALE      │                        │                      │
  │                            │    (expired 0 menit lalu)   │                        │                      │
  │                            │                             │                        │                      │
  │  [Session returned]        │                             │                        │                      │
  │◄───────────────────────────│                             │                        │                      │
  │                            │                             │                        │                      │
  │  [POST /api/photos/upload] │                             │                        │                      │
  │───────────────────────────►│                             │                        │                      │
  │                            │  [verifyDriveFolderId]      │                        │                      │
  │                            │  → Bearer EXPIRED_TOKEN     │                        │                      │
  │                            │─────────────────────────────────────────────────────►│                      │
  │                            │                             │                        │                      │
  │                            │  ← HTTP 401                 │                        │                      │
  │                            │    "Access token expired"   │                        │                      │
  │                            │◄─────────────────────────────────────────────────────│                      │
  │                            │                             │                        │                      │
  │  ← HTTP 500               │                             │                        │                      │
  │    "Gagal mengupload"      │                             │                        │                      │
  │◄───────────────────────────│                             │                        │                      │
```

---

## Kesimpulan Audit Token Lifecycle

### Jawaban untuk 10 Pertanyaan:

| # | Pertanyaan | Jawaban | Bukti (File:Line) |
|---|-----------|---------|-------------------|
| 1 | Isi callback `jwt()` | Hanya menyimpan accessToken dan refreshToken saat login. Tidak ada logic lain. | `[...nextauth]/route.ts:115-121` |
| 2 | Isi callback `session()` | Menyalin accessToken dan refreshToken dari JWT ke session tanpa filter. | `[...nextauth]/route.ts:123-129` |
| 3 | Apakah `account.expires_at` disimpan? | ❌ **TIDAK** | `[...nextauth]/route.ts:117-118` (hanya 2 field) |
| 4 | Apakah `account.refresh_token` disimpan? | ✅ **YA** di `token.refreshToken` | `[...nextauth]/route.ts:118` |
| 5 | Apakah token pernah direfresh? | ❌ **TIDAK PERNAH** | Tidak ada `refreshAccessToken()` di seluruh codebase |
| 6 | Apakah `refreshAccessToken()` sudah ada? | ❌ **TIDAK ADA** | Seluruh 135 baris file tidak mengandung function ini |
| 7 | Apakah `accessTokenExpires` disimpan di JWT? | ❌ **TIDAK** | `types/next-auth.d.ts:1-16` (tidak ada deklarasi field ini) |
| 8 | Apakah session selalu mengembalikan token lama walau expired? | ✅ **YA** | `jwt()` line 121: `return token;` tanpa pengecekan |
| 9 | Apakah Google hanya mengirim refresh_token saat login pertama? | ✅ **YA, tapi ada `prompt: "consent"`** | `[...nextauth]/route.ts:18` |
| 10 | Flow login→jwt→session→upload | Terlampir di diagram atas | - |

### Kategori Root Cause

**Kategori: A, C, dan D — SEMUA TERJADI SEKALIGUS**

| Kategori | Terjadi? | Bukti |
|----------|---------|-------|
| **A. Token expired tetapi tidak direfresh** | ✅ **YA** | `jwt()` line 115-121 tidak ada pengecekan expiry. `refreshAccessToken()` tidak ada. |
| **B. Refresh token tidak pernah tersimpan** | ❌ **TIDAK** — refresh token TERSIMPAN di JWT | `[...nextauth]/route.ts:118` |
| **C. Refresh token tersimpan tetapi tidak digunakan** | ✅ **YA** | `token.refreshToken` disimpan di line 118, tapi tidak ada satu baris kode pun yang membacanya untuk refresh. |
| **D. Session mengembalikan access token stale** | ✅ **YA** | `session()` line 124-127 selalu mengembalikan `token.accessToken` tanpa validasi expiry. Token expired tetap dikembalikan. |

### Root Cause Pasti

**Penyebab langsung 401 Unauthorized:**

```
session.accessToken → berisi token yang sudah expired (tidak ada refresh)
         ↓
dikirim ke Google Drive API → HTTP 401 "Access token has expired"
         ↓
catch block di verifyDriveFolderId menelan error → return null
         ↓
"Gagal mengupload file ke Google Drive" → HTTP 500
```

**Akar masalah ada di** `app/api/auth/[...nextauth]/route.ts` **baris 115-121:**
```typescript
async jwt({ token, account }) {
  if (account) {
    token.accessToken = account.access_token;      // ✅ hanya disimpan
    token.refreshToken = account.refresh_token;     // ✅ disimpan tapi tidak dipakai
    // ❌ expires_at tidak disimpan
    // ❌ expires_in tidak disimpan
    // ❌ accessTokenExpires tidak dibuat
  }
  // ❌ Tidak ada pengecekan: "apakah token expired?"
  // ❌ Tidak ada panggilan ke refresh endpoint
  // ❌ Tidak ada `refreshAccessToken()`
  return token;  // Token lama dikembalikan, expired atau tidak
}
```

**Dan** `app/api/photos/upload/route.ts` **baris 76-87:**
```typescript
const accessToken = session.accessToken;
// ❌ Tidak ada pengecekan: "apakah token ini expired?"
// ❌ Tidak ada pengecekan: "apakah ada refreshToken untuk refresh?"
if (!accessToken) {
  // Hanya cek null/undefined, bukan expired
  return error "token tidak tersedia"
}
```

### Solusi (tidak diterapkan sekarang, hanya diidentifikasi)

Untuk memperbaiki root cause, perubahan yang diperlukan:

1. **Tambah field `accessTokenExpires` di type JWT** (`types/next-auth.d.ts`)
2. **Simpan `account.expires_in`** sebagai `accessTokenExpires` di `jwt()` callback
3. **Buat function `refreshAccessToken()`** yang panggil `https://oauth2.googleapis.com/token`
4. **Di `jwt()` callback**, cek `Date.now() < token.accessTokenExpires` — jika expired, panggil `refreshAccessToken()`
5. **Di `session()` callback**, jika token expired, set `accessToken = undefined` atau trigger refresh
6. **Di `upload/route.ts`, cek `session.accessToken`** dengan pesan error yang jelas jika expired

Detail implementasi ada di `DRIVE_INTEGRATION_AUDIT.md` section 6.1.