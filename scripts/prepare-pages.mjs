// GitHub Pages serves real files rather than a server-side SPA fallback.
// Both URLs load the same app; owner permissions are checked by the service.
import { copyFile, mkdir, writeFile } from "node:fs/promises";
await mkdir("dist/admin", { recursive: true });
await copyFile("dist/index.html", "dist/admin/index.html");
await writeFile("dist/.nojekyll", "");
console.log("Prepared static /admin/ entry for GitHub Pages.");
