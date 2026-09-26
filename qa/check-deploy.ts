import fs from "fs";
import path from "path";

async function main() {
  const authPath = path.join(process.env.APPDATA || "", "com.vercel.cli", "Data", "auth.json");
  const auth = JSON.parse(fs.readFileSync(authPath, "utf8"));
  const token = auth.token;
  const orgId = "team_kdgnzX0lT0KSD80b42fMuUVQ";
  const res = await fetch(`https://api.vercel.com/v6/deployments?teamId=${orgId}&projectId=novixa-beauty-glow&limit=2`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log("Recent deployments:", JSON.stringify(data.deployments?.map((d: any) => ({
    uid: d.uid,
    state: d.state || d.readyState,
    commit: d.meta?.githubCommitMessage,
    url: d.url
  })), null, 2));
}

main().catch(console.error);
