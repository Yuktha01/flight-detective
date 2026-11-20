#!/usr/bin/env node

/**
 * Lambda Deployment Package Builder for Flight Detective Backend using esbuild
 *
 * Produces an ultra-lightweight, production-ready deployment ZIP containing
 * a single bundled lambda.js file with zero node_modules dependencies.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const esbuild = require('esbuild');

const BACKEND_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(BACKEND_DIR, 'dist');
const STAGING_DIR = path.join(BACKEND_DIR, '.lambda-package-staging');
const OUTPUT_ZIP = path.join(BACKEND_DIR, 'flight-detective-lambda.zip');

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  console.log('=== Building Flight Detective AWS Lambda Deployment Package (esbuild) ===\n');

  if (fs.existsSync(OUTPUT_ZIP)) {
    fs.unlinkSync(OUTPUT_ZIP);
  }

  // 1. Bundle TypeScript to a single self-contained lambda.js file
  console.log('Step 1: Bundling with esbuild...');
  cleanDir(DIST_DIR);
  fs.mkdirSync(DIST_DIR, { recursive: true });

  const outfile = path.join(DIST_DIR, 'lambda.js');

  await esbuild.build({
    entryPoints: [path.join(BACKEND_DIR, 'src', 'lambda.ts')],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    outfile: outfile,
    minify: true,
    sourcemap: false,
  });

  // 2. Prepare staging directory for clean zipping
  cleanDir(STAGING_DIR);
  fs.mkdirSync(STAGING_DIR, { recursive: true });

  // Copy bundled file as lambda.js so handler is lambda.handler
  fs.copyFileSync(outfile, path.join(STAGING_DIR, 'lambda.js'));

  // 3. Create ZIP archive
  console.log('Step 2: Creating deployment ZIP package...');
  let archived = false;

  try {
    const relativeZip = path.relative(STAGING_DIR, OUTPUT_ZIP);
    execSync(`tar -a -c -f "${relativeZip}" *`, {
      cwd: STAGING_DIR,
      stdio: 'pipe',
      shell: process.platform === 'win32' ? 'powershell' : '/bin/sh',
    });
    archived = true;
  } catch (_tarErr) {}

  if (!archived && process.platform === 'win32') {
    try {
      execSync(
        `powershell -NoProfile -Command "Compress-Archive -Path '${STAGING_DIR}\\*' -DestinationPath '${OUTPUT_ZIP}' -Force"`,
        { stdio: 'inherit' }
      );
      archived = true;
    } catch (_psErr) {}
  }

  if (!archived) {
    execSync(`zip -r "${OUTPUT_ZIP}" .`, {
      cwd: STAGING_DIR,
      stdio: 'inherit',
    });
  }

  // Clean staging directory
  cleanDir(STAGING_DIR);

  if (!fs.existsSync(OUTPUT_ZIP)) {
    throw new Error(`ZIP package was not found at ${OUTPUT_ZIP}`);
  }

  const stats = fs.statSync(OUTPUT_ZIP);
  const sizeKb = (stats.size / 1024).toFixed(1);

  console.log('\n=== Lambda Deployment Package Created Successfully ===');
  console.log(`Path: ${OUTPUT_ZIP}`);
  console.log(`Size: ${sizeKb} KB (${stats.size} bytes)`);
  console.log('Runtime: Node.js 22.x');
  console.log('Handler: lambda.handler\n');
}

main().catch((err) => {
  console.error('\nBuild failed:', err);
  cleanDir(STAGING_DIR);
  process.exit(1);
});
