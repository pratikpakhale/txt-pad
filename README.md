# txt-pad

> End-to-end encrypted personal notepad. Your password is your key — no recovery possible.

**[txt.pakhale.com](https://txt.pakhale.com)**

---

## How it works

- Enter any **username + password** — no signup, no account creation
- Your notes are encrypted in the browser using **AES-256-GCM** before leaving your device
- The encryption key is derived from your password via **PBKDF2** (200k iterations, SHA-256)
- The server stores only opaque encrypted bytes — it cannot read your notes
- Wrong password → AES-GCM auth tag fails → locked out, permanently. No recovery.

## Stack

- **Next.js** (App Router)
- **Vercel Blob** — stores `notes/{username}.enc`
- **WebCrypto API** — all encryption happens client-side, zero deps

## Encryption details

```
key  = PBKDF2(password, salt=username, iterations=200_000, hash=SHA-256) → AES-GCM 256-bit
blob = IV (12 bytes) || AES-GCM ciphertext
```

## Self-hosting

```bash
git clone https://github.com/pratikpakhale/txt-pad
cd txt-pad
npm install
```

Add a `.env.local`:

```env
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

```bash
npm run dev
```

Deploy to Vercel and attach a Blob store — that's it.
