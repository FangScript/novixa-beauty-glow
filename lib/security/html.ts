export function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}
export function serializeJsonLd(value: unknown) {
  return (JSON.stringify(value) || "null").replace(/</g, "\\u003c");
}
