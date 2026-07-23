import { build } from "esbuild";
import { mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const [entryPoint, functionName] = process.argv.slice(2);
if (!entryPoint || !functionName || !/^[A-Za-z0-9_-]+$/.test(functionName)) {
  throw new Error("Usage: node scripts/build-lambda.mjs <entry.ts> <functionName>");
}

const outputDirectory = path.resolve("Back-end/src/aws-lambdas/dist", functionName);
const outputFile = path.join(outputDirectory, "index.js");
const zipFile = path.join(outputDirectory, "index.zip");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await build({
  entryPoints: [entryPoint],
  outfile: outputFile,
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
  sourcemap: false,
  minify: true
});

if (process.platform === "win32") {
  execFileSync("tar", ["-a", "-c", "-f", "index.zip", "index.js"], {
    cwd: outputDirectory,
    stdio: "inherit"
  });
} else {
  execFileSync("zip", ["-j", zipFile, outputFile], { stdio: "inherit" });
}

console.log(`Lambda artifact created: ${zipFile}`);
