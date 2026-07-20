#!/usr/bin/env node
/** Thin wrapper — real generator is make-badge.py (see SPEC.md) */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const py = path.join(__dirname, 'make-badge.py');
const r = spawnSync('python', [py, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);