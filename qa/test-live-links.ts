async function test() {
  const res = await fetch("https://novixa-beauty-glow.vercel.app/");
  const html = await res.text();
  const matches = [...html.matchAll(/href="(\/products\/[^"]+)"/g)].map((m) => m[1]);
  console.log("Homepage product links:", matches);
}
test().catch(console.error);
