/**
 * Resolves a stored profile photo string into a reliable, browser-loadable URL.
 * Handles Data URIs, Google Drive streams, Next.js static public assets, and external links.
 */
export function resolvePhotoUrl(profilePhoto: string | null | undefined): string | null {
  if (!profilePhoto) return null;
  const trimmed = profilePhoto.trim();
  if (!trimmed) return null;

  // 1. Inline Data URI (base64) - completely self-contained, no network request needed
  if (trimmed.startsWith("data:")) {
    return trimmed;
  }

  // 2. Direct HTTP / HTTPS URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // 3. Google Drive file
  if (trimmed.startsWith("gdrive:")) {
    return `/api/photos/${encodeURIComponent(trimmed)}/view`;
  }

  // 4. Static public file in /public/photos
  const cleanName = trimmed.replace(/^\/?(photos\/)?/, "");
  return `/photos/${cleanName}`;
}
