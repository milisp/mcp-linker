// scripts/bump.ts
import { readFileSync, writeFileSync } from "fs";

const newVersion = process.argv[2];
if (!newVersion) {
  console.error("❌ Usage: bun scripts/bump.ts 1.1.0");
  process.exit(1);
}

const configPath = "src-tauri/tauri.conf.json";
const json = JSON.parse(readFileSync(configPath, "utf8"));

json.version = newVersion;

writeFileSync(configPath, JSON.stringify(json, null, 2) + "\n");

console.log(`✅ Updated tauri.conf.json to version ${newVersion}`);

// Git commit and tag
await $`git add ${configPath}`;
await $`git commit -m "chore: bump version to ${newVersion}"`;
await $`git tag v${newVersion}`;
await $`git push origin v${newVersion}`;