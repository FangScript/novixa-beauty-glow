async function test() {
  const urls = [
    "https://novixa-beauty-glow.vercel.app/products/velvet-rose-eau-de-parfum",
    "https://novixa-beauty-glow.vercel.app/products/pro-makeup-brush-set",
    "https://novixa-beauty-glow.vercel.app/products/blending-sponges-set",
  ];

  for (const url of urls) {
    const res = await fetch(url);
    const html = await res.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    console.log({
      url,
      status: res.status,
      title: titleMatch?.[1],
      h1: h1Match?.[1],
    });
  }
}
test().catch(console.error);
