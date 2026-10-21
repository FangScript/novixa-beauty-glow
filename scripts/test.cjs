// Compile tests with the installed TypeScript compiler; no network runner download.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const tempRoot = fs.realpathSync(os.tmpdir());
const output = fs.mkdtempSync(path.join(tempRoot, "novixa-tests-"));
try {
  const testFiles = fs
    .readdirSync(path.join(root, "tests"))
    .filter((name) => name.endsWith(".test.ts"));
  const program = ts.createProgram(
    testFiles.map((name) => path.join(root, "tests", name)),
    {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      noEmitOnError: true,
      rootDir: root,
      outDir: output,
      types: ["node"],
    },
  );
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    console.error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => root,
        getNewLine: () => "\n",
      }),
    );
    process.exitCode = 1;
  } else {
    program.emit();
    const result = spawnSync(
      process.execPath,
      [
        "--test",
        ...testFiles.map((name) => path.join(output, "tests", name.replace(/\.ts$/, ".js"))),
      ],
      {
        stdio: "inherit",
        cwd: output,
        env: { ...process.env, NODE_PATH: path.join(root, "node_modules") },
      },
    );
    if (result.error) console.error(result.error);
    process.exitCode = result.status ?? 1;
  }
} finally {
  // Only remove this run's generated directory, never a caller-supplied path.
  const resolved = fs.realpathSync(output);
  if (path.dirname(resolved) === tempRoot && path.basename(resolved).startsWith("novixa-tests-")) {
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
