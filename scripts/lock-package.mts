import childProcess from 'node:child_process';
import process from 'node:process';
import { rootAsCwd } from './utils/directory-util.mjs';

function main(): void {
	let autoPush = process.argv[2] === 'auto-push';

	rootAsCwd();
	childProcess.spawnSync('npm', ['install', '--package-lock-only']);

	if (autoPush) {
		childProcess.spawnSync('git', ['add', 'package-lock.json']);
		childProcess.spawnSync('git', ['commit', 'package-lock.json', '-m', 'chore: generate package-lock.json']);
		childProcess.spawnSync('git', ['push', 'origin']);
	}
}

main();