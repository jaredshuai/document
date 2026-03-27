#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const SW_PATH = join(rootDir, 'dist', 'sw.js');

console.log('Starting build process...');

// Run Vite build
console.log('Running vite build...');
const viteProcess = spawn('pnpm', ['exec', 'vite', 'build'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

viteProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`vite build failed with exit code ${code}`);
    process.exit(code);
  }

  console.log('vite build completed successfully.');

  // Inject timestamp into sw.js for versioning
  if (existsSync(SW_PATH)) {
    try {
      const timestamp = Date.now().toString();
      let swContent = readFileSync(SW_PATH, 'utf-8');

      // Replace SW_VERSION_PLACEHOLDER with actual timestamp
      swContent = swContent.replace(/SW_VERSION_PLACEHOLDER/g, timestamp);

      writeFileSync(SW_PATH, swContent, 'utf-8');
      console.log(`Service Worker version updated with timestamp: ${timestamp}`);
    } catch (err) {
      console.error(`Error updating Service Worker: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.warn('Warning: dist/sw.js not found, skipping version injection.');
  }

  console.log('Build completed successfully!');
});
