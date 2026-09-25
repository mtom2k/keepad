import { rm } from 'node:fs/promises';
// Removed source modules must not survive in packaged output.
await rm(new URL('../dist-electron/', import.meta.url), { recursive: true, force: true });
