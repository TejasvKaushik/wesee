#!/usr/bin/env node

/**
 * Script to copy PDF.js worker file to public directory
 * Run with: node scripts/setup-pdf-worker.js
 */

const fs = require('fs');
const path = require('path');

const workerSource = path.join(
  __dirname,
  '..',
  'node_modules',
  'pdfjs-dist',
  'build',
  'pdf.worker.min.mjs'
);

const workerDest = path.join(__dirname, '..', 'public', 'pdf.worker.min.mjs');

console.log('📦 Setting up PDF.js worker file...');
console.log(`Source: ${workerSource}`);
console.log(`Destination: ${workerDest}`);

try {
  // Check if source exists
  if (!fs.existsSync(workerSource)) {
    console.error('❌ Error: PDF.js worker file not found!');
    console.error('   Make sure pdfjs-dist is installed:');
    console.error('   npm install pdfjs-dist');
    process.exit(1);
  }

  // Copy the file
  fs.copyFileSync(workerSource, workerDest);
  console.log('✅ PDF.js worker file copied successfully!');
  console.log('');
  console.log('Next step:');
  console.log('Update lib/pdf-parser.ts line 34 to use local worker:');
  console.log("  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';");
  console.log('');
} catch (error) {
  console.error('❌ Error copying worker file:', error.message);
  process.exit(1);
}

