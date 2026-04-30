# Architecture Research: Pantry Image Storage Strategy

**Decision:** Store pantry scan images in object storage referenced by key; generate signed URLs at read time  
**Prepared:** April 2026  
**Feeds into:** ADR-007

---

## The problem

Every image-based pantry scan uploads a photo (JPEG/PNG/WebP/GIF, up to 5 MB). That image must be:
- Stored durably so it can be referenced in the session history
- Accessible to Claude Vision for ingredient detection
- Retrievable for display in the session history screen ("scan from last Tuesday")
- Protected so that one user cannot access another user's images

The decision is how to store and reference the image: where does it live, and what does the DB record?

### Hard constraints

| # | Requirement | Why |
|---|---|---|
| H1 | Privacy isolation | One user must never be able to retrieve another user's fridge photo — even by guessing a URL pattern |
| H2 | Durable storage | Images are referenced in session history; losing them breaks the history screen and may cause confusion if the image was the basis for saved recipes |
| H3 | No DB bloat | Storing raw image bytes in PostgreSQL breaks DB performance; a 5 MB image in a row makes every table scan and backup significantly larger |
| H4 | Retrievable by the backend for Claude Vision | The backend must be able to pass the image (as base64 or URL) to the Anthropic Vision API |
| H5 | Works from both web and mobile | The retrieval mechanism must work from a browser and a native mobile app |

### Soft preferences

| # | Preference | Why |
|---|---|---|
| S1 | Thumbnail generation | The session history screen should show a small thumbnail, not request a full 5 MB image |
| S2 | TTL-based expiry | Old scan images from inactive users should be automatically cleaned up to manage storage costs |
| S3 | Audit trail | The stored key should encode the session ID so storage paths are self-documenting |

---

## Options evaluated

### 1. Object storage with key reference + signed URLs ✅ CHOSEN

**What it is:** Upload the image to Supabase Storage (S3-compatible). Store the path key (`sessions/<session_id>/original.jpg`) in `pantry_sessions.image_stored_key`. At read time, generate a short-lived signed URL (e.g. 1-hour TTL) via the Supabase Storage API and return it to the client.

```python
# Upload
bucket.upload(f"sessions/{session_id}/original.jpg", image_bytes)

# Read — generate signed URL on demand
signed_url = bucket.create_signed_url(f"sessions/{session_id}/original.jpg", expires_in=3600)
```

**How it satisfies requirements:**

| Requirement | How |
|---|---|
| H1 Privacy | Supabase Row-Level Security + private bucket; signed URLs are scoped to the requesting user's session and expire in 1 hour. A guessed path returns 403. |
| H2 Durable storage | Supabase Storage (backed by S3) provides 11 nines of durability |
| H3 No DB bloat | Only a 60-character path string is stored in Postgres; the image file lives in object storage |
| H4 Claude Vision | Backend reads the file directly from the storage bucket using the service key (bypasses signed URL) and base64-encodes it |
| H5 Web + mobile | Signed URLs are plain HTTPS — work from any HTTP client on any platform |
| S1 Thumbnails | Generate and store `sessions/<session_id>/thumb.jpg` alongside the original; stored_key and thumbnail_key are separate columns |
| S2 TTL expiry | Supabase Storage lifecycle policies can auto-delete objects older than N days |
| S3 Audit trail | `sessions/<session_id>/original.jpg` — the session ID is directly in the path |

**Weaknesses:**
- Signed URL generation is an API call with ~50–100 ms latency. For a session history screen showing 20 thumbnails, this is 20 sequential or parallel signed URL generations. Mitigation: batch generation or client-side caching of URLs until they expire.
- Short-lived URLs mean the client cannot cache the image URL across sessions. A user who screenshots the URL and shares it will find it expired within an hour. For a private fridge photo, this is a feature, not a bug.
- If Supabase Storage is unavailable, signed URL generation fails. This must be handled gracefully in the UI (show placeholder, not an error).

---

### 2. Permanent public URL stored in DB

**What it is:** Upload the image to a public storage bucket. Store the full public URL in `pantry_sessions.image_url`. The client loads the image directly from that URL.

```sql
image_url TEXT  -- e.g. "https://storage.supabase.co/object/public/pantry-images/sessions/abc123/original.jpg"
```

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Privacy | ❌ A public URL can be accessed by anyone with the URL — no auth required. A user's fridge contents (dietary signals, medications visible on shelves) are exposed to anyone who gets the URL |
| H2 Durable | ✅ The image is in object storage; the URL is permanent |
| H3 No DB bloat | ✅ A URL string, not image bytes |
| H4 Claude Vision | ✅ Claude can fetch images from public URLs directly (pass URL instead of base64) |
| H5 Web + mobile | ✅ Plain HTTP URL |

**The decisive problem:** Fridge photos reveal household composition, dietary restrictions, medications, and lifestyle. A URL pattern like `.../sessions/abc123/original.jpg` is guessable if the session ID is not sufficiently random (UUIDs are fine, but the URL once known is permanent). More critically: Supabase CDN may cache these images. Even if the bucket is made private later, cached CDN copies may remain accessible. Permanent public URLs for private medical/dietary content are a privacy anti-pattern.

**Verdict:** Ruled out on H1 (privacy). Permanent public URLs for personal health-adjacent content are not acceptable.

---

### 3. Base64-encoded image stored in PostgreSQL

**What it is:** Store the raw image as a base64 string or `BYTEA` binary column directly in `pantry_sessions`.

```sql
image_data BYTEA  -- raw image bytes
image_base64 TEXT  -- base64-encoded string (~6.7 MB for a 5 MB image)
```

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Privacy | ✅ Data is behind DB auth; no public URL to leak |
| H2 Durable | ✅ Postgres backups include the image data |
| H3 No DB bloat | ❌ A 5 MB image stored as `BYTEA` or base64 makes `pantry_sessions` rows ~5–7 MB each. With 1,000 scans, the sessions table is 5–7 GB. DB backups become enormous. Table scans that read unrelated columns (e.g. `status`) must page past the image data. |
| H4 Claude Vision | ⚠️ The backend reads the bytes from Postgres and base64-encodes them for the Anthropic API — works but adds a full DB round-trip to the request path |
| H5 Web + mobile | ⚠️ The backend must serve the image as a download endpoint — no CDN caching, no parallel loading |

**The fatal flaw:** Storing binary file data in a relational database is a well-documented anti-pattern. PostgreSQL is not optimised for sequential byte stream retrieval. Even with TOAST compression, large binary columns cause page bloat, slow vacuums, and inflated backup sizes. The one legitimate use case (atomic consistency between the row and the data) does not apply here — we do not need the image and the session row to be updated in the same transaction.

**Verdict:** Ruled out on H3 (DB bloat). PostgreSQL is for structured queryable data; object storage is for binary files.

---

### 4. Pass image directly to Claude — do not store

**What it is:** Accept the upload, immediately pass it to Claude Vision, discard the bytes. Store only the detected ingredient list. No image stored anywhere.

**Assessment:**

| Requirement | Assessment |
|---|---|
| H1 Privacy | ✅ No image stored means no image to leak |
| H2 Durable | ❌ The image is gone after detection. The session history screen cannot show "your scan from last Tuesday" — no image to display |
| H3 No DB bloat | ✅ Nothing stored |
| H4 Claude Vision | ✅ Image is passed directly; no storage step |
| H5 Web + mobile | N/A — no image retrieval needed |

**The product trade-off:** Not storing the image is the most privacy-preserving choice. It is also the choice that eliminates a product feature (scan history with image preview) and the ability to re-run detection on a historical image if the model improves.

For MVP, the session history screen is planned but not yet implemented. If image preview is deprioritised permanently, option 4 is the cleanest implementation. Given that scan history with image context is a core feature for the "busy parent" persona (who wants to remember what was in their fridge last week), we store the image.

**Verdict:** Valid for a privacy-maximising MVP with no history screen. Rejected because scan history with image context is a planned core feature.

---

## Side-by-side comparison

| Criterion | Key + signed URL | Permanent public URL | Base64 in DB | No storage |
|---|---|---|---|---|
| Privacy isolation | ✅ | ❌ | ✅ | ✅ |
| Durable storage | ✅ | ✅ | ✅ | ❌ |
| No DB bloat | ✅ | ✅ | ❌ | ✅ |
| Backend access for Claude Vision | ✅ | ✅ | ⚠️ | ✅ |
| Web + mobile client access | ✅ | ✅ | ⚠️ | N/A |
| Scan history image preview | ✅ | ✅ | ✅ | ❌ |
| CDN-cached (shareable) | ❌ (intentional) | ✅ | ❌ | N/A |
| Hard constraints met (of 5) | **5 / 5** | 4 / 5 | 3 / 5 | 3 / 5 |

---

## Decision rationale summary

Object storage with key reference and signed URL generation is the only option that satisfies all five hard constraints. The key insight is the separation between the **reference** (a path string in Postgres) and the **content** (bytes in S3-compatible storage). Postgres stores a short string; Supabase Storage stores the file; the backend generates a short-lived URL on demand.

The signed URL TTL (1 hour) is a deliberate privacy control for content that is personal (fridge contents can reveal dietary restrictions, medications, household composition). It makes URLs non-shareable and non-cacheable — appropriate for this data type.

---

## Revisit if

- **Session history thumbnails become a performance problem** — implement server-side thumbnail generation on upload (Sharp via a Supabase Edge Function) and store `thumbnail_key` in the session row.
- **Signed URL generation latency affects the history screen** — batch-generate all signed URLs in a single API call when the history list is fetched; cache them client-side for the URL's TTL.
- **Privacy requirements tighten** — move to zero image storage (option 4) and provide text-based session history ("you detected 8 ingredients including chicken breast and lemon") without the image preview.
- **We add a desktop web app** — confirm that Supabase Storage's signed URL CORS policy allows the web origin; adjust bucket CORS config if needed.
