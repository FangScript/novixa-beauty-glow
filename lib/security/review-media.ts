export function isReviewMedia(value: string, storageUrl?: string) {
  const filename = "review-[0-9]+-[a-f0-9-]+\\.(?:jpg|jpeg|png|webp|avif|gif|jfif)";
  if (new RegExp("^/uploads/reviews/" + filename + "$").test(value)) return true;
  if (!storageUrl) return false;
  try {
    const url = new URL(value),
      storage = new URL(storageUrl);
    return (
      url.protocol === "https:" &&
      url.origin === storage.origin &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      new RegExp("^/storage/v1/object/public/products/reviews/" + filename + "$").test(url.pathname)
    );
  } catch {
    return false;
  }
}
