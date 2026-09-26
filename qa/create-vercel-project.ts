import fs from "fs";
import path from "path";

async function createProject() {
  const authPath = path.join(process.env.APPDATA || "", "com.vercel.cli", "Data", "auth.json");
  const auth = JSON.parse(fs.readFileSync(authPath, "utf8"));
  const token = auth.token;

  const orgId = "team_kdgnzX0lT0KSD80b42fMuUVQ";
  const projectName = "novixa-beauty-glow";

  console.log(`Creating project ${projectName} on Vercel team ${orgId}...`);

  // 1. Parse .env and .env.local
  const envMap: Record<string, string> = {};
  const envContent = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1).trim();
    }
    if (val.length > 0) envMap[key] = val;
  }

  const envLocalPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const localContent = fs.readFileSync(envLocalPath, "utf8");
    for (const line of localContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1).trim();
      }
      if (val.length > 0 && !envMap[key]) envMap[key] = val;
    }
  }

  // Adjust app and auth urls for production
  envMap["APP_URL"] = `https://${projectName}.vercel.app`;
  envMap["AUTH_URL"] = `https://${projectName}.vercel.app`;

  const targets = ["production", "preview", "development"];
  const environmentVariables = Object.entries(envMap).map(([key, value]) => ({
    key,
    value,
    type: "plain",
    target: targets,
  }));

  // 2. Create the project via Vercel API
  const createRes = await fetch(`https://api.vercel.com/v9/projects?teamId=${orgId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName,
      framework: "nextjs",
      buildCommand: "prisma generate && next build",
      environmentVariables,
    }),
  });

  const createData = await createRes.json();
  console.log("Create project response:", createRes.status, createData.id ? `Success (ID: ${createData.id})` : createData);

  if (createData.id) {
    // 3. Update .vercel/project.json locally
    const projectJson = {
      projectId: createData.id,
      orgId: orgId,
      projectName: projectName,
    };
    fs.mkdirSync(path.join(process.cwd(), ".vercel"), { recursive: true });
    fs.writeFileSync(path.join(process.cwd(), ".vercel", "project.json"), JSON.stringify(projectJson, null, 2));
    console.log("Updated .vercel/project.json with new Project ID:", createData.id);
  }
}

createProject().catch(console.error);
