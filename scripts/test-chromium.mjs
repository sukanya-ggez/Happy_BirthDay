// Local test helper. Extract packaged Chromium without changing file ownership.
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import { createBrotliDecompress } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
export async function linuxChromium(output) {
  const { default: binary } = await import("@sparticuz/chromium");
  const bin = path.resolve(
    path.dirname(fileURLToPath(import.meta.resolve("@sparticuz/chromium"))),
    "../bin",
  );
  const dir = path.join(output, "chromium-runtime");
  await fs.mkdir(dir, { recursive: true });
  const executablePath = path.join(dir, "chromium");
  let ready = false;
  try {
    ready = (await fs.stat(executablePath)).size > 1000000;
  } catch {}
  if (!ready || process.env.CODEX_PRIMARY_RUNTIME) {
    await pipeline(
      createReadStream(path.join(bin, "chromium.br")),
      createBrotliDecompress(),
      createWriteStream(executablePath),
    );
    await fs.chmod(executablePath, 0o700);
    for (const name of ["fonts", "swiftshader"]) {
      const archive = path.join(dir, name + ".tar");
      await pipeline(
        createReadStream(path.join(bin, name + ".tar.br")),
        createBrotliDecompress(),
        createWriteStream(archive),
      );
      const r = spawnSync("tar", [
        "--no-same-owner",
        "-xf",
        archive,
        "-C",
        dir,
      ]);
      if (r.status !== 0) throw new Error(r.stderr.toString());
    }
  }
  await fs.chmod(executablePath, 0o700);
  return {
    headless: true,
    executablePath,
    args: binary.args.filter(
      (arg) =>
        ![
          "--single-process",
          "--in-process-gpu",
          "--disable-web-security",
        ].includes(arg),
    ),
    env: {
      ...process.env,
      FONTCONFIG_PATH: path.join(dir, "fonts"),
      LD_LIBRARY_PATH: dir,
    },
  };
}
