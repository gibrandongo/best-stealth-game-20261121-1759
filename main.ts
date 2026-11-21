// Gloam Archive — make.fun hand-in program.
// Copies game/ and screenshots/ from this repository to the output
// directory and writes dossier.json with buildDossier from the kit's
// vendor/makefun-game.ts. Standard library only, deterministic: two runs
// write byte-identical output. Never deletes the output directory
// itself — only its contents — so a mounted /output keeps working.
import { buildDossier } from "./vendor/makefun-game.ts";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
const TEXT_MAX_BYTES = 163840;

function clearContents(dir) {
  for (const child of readdirSync(dir)) {
    rmSync(join(dir, child), { recursive: true, force: true });
  }
}

async function main() {
  if (!existsSync(join(repoRoot, "game", "index.html"))) {
    throw new Error("game/index.html is missing from the repository");
  }
  if (!existsSync(join(repoRoot, "screenshots"))) {
    throw new Error("screenshots/ is missing from the repository");
  }
  mkdirSync(outDir, { recursive: true });
  clearContents(outDir);
  cpSync(join(repoRoot, "game"), join(outDir, "game"), { recursive: true });
  cpSync(join(repoRoot, "screenshots"), join(outDir, "screenshots"), { recursive: true });
  const dossier = await buildDossier(repoRoot, { text_max_bytes: TEXT_MAX_BYTES });
  writeFileSync(join(outDir, "dossier.json"), dossier);
}

main().catch(function (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
