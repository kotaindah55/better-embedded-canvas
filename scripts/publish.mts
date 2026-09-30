import childProcess from 'node:child_process';
import { getManifest } from './utils/config-util.mjs';
import { isValidVersion } from './utils/version-util.mjs';

async function main(): Promise<void> {
	const { version } = await getManifest();
	if (!isValidVersion(version)) throw Error('Manifest use invalid version');

	childProcess.spawnSync('git', ['tag', '-a', version, '-f', '-m', `'${version}'`]);
	childProcess.spawnSync('git', ['push', '-f', 'origin', version]);
}

await main();
