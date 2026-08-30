import { chmod, rm } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const outputDirectory = path.resolve("dist-cli");
const outputFile = path.join(outputDirectory, "osdeck.cjs");

await rm(outputDirectory, { recursive: true, force: true });
await build({
  entryPoints: ["cli/index.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  outfile: outputFile,
  logLevel: "info",
});
await chmod(outputFile, 0o755);
