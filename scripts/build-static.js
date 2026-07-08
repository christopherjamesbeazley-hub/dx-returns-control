import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");

if (existsSync(dist)) {
  rmSync(dist, { recursive: true, force: true });
}

mkdirSync(join(dist, "src"), { recursive: true });
copyFileSync("index.html", join(dist, "index.html"));
cpSync("src", join(dist, "src"), { recursive: true });

console.log("Static build written to dist");
