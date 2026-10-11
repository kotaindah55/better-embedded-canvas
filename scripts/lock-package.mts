import childProcess from 'node:child_process';
import process from 'node:process';
import { rootAsCwd } from './utils/directory-util.mjs';

function main(): void {
	const autoPush = process.argv[2] === 'auto-push';

	rootAsCwd();
	childProcess.spawnSync('pnpm', ['install', '--lockfile-only']);

	if (autoPush) {
		childProcess.spawnSync('git', ['add', 'pnpm-lock.yaml']);
		childProcess.spawnSync('git', ['commit', 'pnpm-lock.yaml', '-m', 'chore: generate pnpm-lock.yaml']);
		childProcess.spawnSync('git', ['push', 'origin']);
	}
}

main();
