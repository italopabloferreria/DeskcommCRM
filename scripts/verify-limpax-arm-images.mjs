import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const REQUIRED_SMOKES = [
  'O container chega a servir?',
  'A imagem extrai texto de PDF?',
  'O laço do event_log CARREGA dentro da imagem do worker?',
  'O worker BOOTA com o CMD da imagem? (sem banco no runner, o boot para na camada de banco)',
  'O scheduler sobe E tem o evento do event_log no crontab?',
];

// Reuse the existing production probes, rather than maintaining a second smoke suite.
// This accepts only literal run blocks in the canonical workflow and fails closed on drift.
export function extractSmokes(source) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  return REQUIRED_SMOKES.map((name) => {
    const matches = lines.map((line, index) => line === `      - name: ${name}` ? index : -1).filter((index) => index >= 0);
    if (matches.length !== 1) throw new Error(`Expected exactly one production probe: ${name}`);
    const start = matches[0] + 1;
    if (lines[start] !== '        run: |') throw new Error(`Probe must remain a literal shell block: ${name}`);
    const body = [];
    for (let i = start + 1; i < lines.length; i++) {
      if (lines[i] && !lines[i].startsWith('          ')) break;
      body.push(lines[i].slice(10));
    }
    const shell = body.join('\n').trim();
    if (!shell.startsWith('set -euo pipefail') || !shell.includes('docker run')) {
      throw new Error(`Incomplete production probe: ${name}`);
    }
    return { name, shell };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const probes = extractSmokes(readFileSync('.github/workflows/publish-image.yml', 'utf8'));
  if (process.argv.includes('--check')) {
    process.stdout.write(`Validated ${probes.length} production probes; Docker not started.\n`);
  } else {
    if (process.env.GITHUB_ACTIONS !== 'true' || process.platform !== 'linux' || process.arch !== 'arm64') {
      throw new Error('ARM image smoke runs only on the native ARM GitHub runner.');
    }
    try {
      for (const probe of probes) {
        process.stdout.write(`::group::${probe.name}\n`);
        const result = spawnSync('bash', ['-c', probe.shell], { stdio: 'inherit', timeout: 240_000 });
        process.stdout.write('::endgroup::\n');
        if (result.error || result.status !== 0) throw new Error(`Production probe failed: ${probe.name}`);
      }
      process.stdout.write('ARM packaging probes passed; real database, WhatsApp and user flows remain unverified.\n');
    } finally {
      spawnSync('docker', ['rm', '-f', 'smoke', 'worker-laco', 'worker-boot', 'sched'], { stdio: 'ignore', timeout: 30_000 });
    }
  }
}