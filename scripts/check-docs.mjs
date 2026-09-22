import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const failures = [];
const required = [
  'README.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'docs/README.md',
  'docs/progress.md',
  'docs/architecture.md',
  'docs/data-model.md',
  'docs/ux.md',
  'docs/testing.md',
  'docs/releasing.md',
  'docs/troubleshooting.md',
  'docs/reference.md',
  'docs/maintenance.md',
  'docs/documentation-impact.json',
  'docs/adr/README.md',
  'docs/adr/template.md',
  'docs/screenshots/README.md',
  '.github/pull_request_template.md',
];
for (const file of required)
  if (!existsSync(file)) failures.push(`Missing required document: ${file}`);
const markdown = ['README.md', 'AGENTS.md', 'CONTRIBUTING.md', '.github/pull_request_template.md'];
function collect(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(file);
    else if (file.endsWith('.md')) markdown.push(file);
  }
}
collect('docs');
for (const file of markdown.filter(existsSync)) {
  const prose = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
  // Repository links should be portable; no developer-machine or app-only links.
  for (const match of prose.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const raw = match[1]
      .trim()
      .replace(/^<([^>]+)>.*$/, '$1')
      .split(/\s+"/)[0];
    if (/^(https?:|mailto:)/.test(raw)) continue;
    if (/^(file:|codex:|\/)/.test(raw)) {
      failures.push(`${file}: nonportable link ${raw}`);
      continue;
    }
    let relative;
    try {
      relative = decodeURIComponent(raw.split('#')[0]);
    } catch {
      failures.push(`${file}: malformed link ${raw}`);
      continue;
    }
    if (!relative) continue;
    const target = path.resolve(path.dirname(file), relative);
    if (!target.startsWith(root + path.sep) && target !== root)
      failures.push(`${file}: link escapes repository: ${raw}`);
    else if (!existsSync(target)) failures.push(`${file}: broken link ${raw}`);
  }
}
for (const name of ['editor', 'launcher', 'button-editor']) {
  const file = `docs/screenshots/${name}.png`;
  if (!existsSync(file)) failures.push(`Missing screenshot: ${file}`);
  else {
    const bytes = readFileSync(file);
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || statSync(file).size < 1000)
      failures.push(`Invalid screenshot: ${file}`);
  }
}
const reference = spawnSync(
  process.execPath,
  ['--import', 'tsx', 'scripts/generate-reference.ts', '--check'],
  { encoding: 'utf8' },
);
if (reference.status !== 0)
  failures.push(
    (
      reference.stderr ||
      reference.stdout ||
      reference.error?.message ||
      'Reference generation failed'
    ).trim(),
  );
const baseIndex = process.argv.indexOf('--base');
if (baseIndex !== -1) {
  const base = process.argv[baseIndex + 1];
  if (!base || base.startsWith('-')) failures.push('--base requires a Git reference.');
  else {
    const diff = spawnSync('git', ['diff', '--name-only', base, '--'], { encoding: 'utf8' });
    if (diff.status !== 0)
      failures.push(`Cannot compare documentation impact against ${base}: ${diff.stderr.trim()}`);
    else {
      const changed = new Set(diff.stdout.trim().split('\n').filter(Boolean));
      const { rules } = JSON.parse(readFileSync('docs/documentation-impact.json', 'utf8'));
      for (const rule of rules) {
        const affected = [...changed].some(
          (file) =>
            (rule.files ?? []).includes(file) ||
            (rule.prefixes ?? []).some((prefix) => file.startsWith(prefix)),
        );
        if (!affected) continue;
        for (const file of rule.allOf ?? [])
          if (!changed.has(file)) failures.push(`${rule.name}: update ${file} in the same change.`);
        if (!rule.anyOf.some((file) => changed.has(file)))
          failures.push(`${rule.name}: update at least one of ${rule.anyOf.join(', ')}.`);
      }
    }
  }
}
if (failures.length) {
  console.error(failures.map((f) => `- ${f}`).join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Documentation checks passed (${markdown.length} Markdown files${baseIndex !== -1 ? ', including source-impact review' : ''}).`,
  );
