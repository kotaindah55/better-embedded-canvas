import childProcess from 'node:child_process';
import process from 'node:process';
import { compareVersions } from 'compare-versions';
import { getLastChangelog } from './utils/changelog-util.mjs';
import { getManifest, getPackageConfig, getVersionHistory, updateManifest, updatePackageConfig, updateVersionHistory } from './utils/config-util.mjs';
import { isValidVersion } from './utils/version-util.mjs';
import { rootAsCwd } from './utils/directory-util.mjs';

async function main(): Promise<void> {
	const { version: targetVersion } = await getLastChangelog();
	const manifest = await getManifest();

	if (!isValidVersion(manifest.version))
		throw Error('Manifest use invalid version');
	if (compareVersions(targetVersion, manifest.version) >= 0)
		throw Error('Current version is less than previous version');

	const message = `chore: bump version to ${targetVersion}`;
	const tobeCommitted = ['manifest.json', 'package.json', 'versions.json', 'CHANGELOGS.txt'];
	const packageConfig = await getPackageConfig();
	const versionHistory = await getVersionHistory();
	const autoPush = process.argv[2] === 'auto-push';

	packageConfig.version = targetVersion;
	manifest.version = targetVersion;
	versionHistory[targetVersion] = manifest.minAppVersion;

	await updatePackageConfig(packageConfig);
	await updateManifest(manifest);
	await updateVersionHistory(versionHistory);

	if (autoPush) try {
		rootAsCwd();
		childProcess.spawnSync('git', ['add', ...tobeCommitted]);
		childProcess.spawnSync('git', ['commit', ...tobeCommitted, '-m', message]);
		childProcess.spawnSync('git', ['push', 'origin']);
		console.log(`Package has been successfully bumped to: ${targetVersion}`);
	} catch (err) {
		console.log('Error encountered when bumping version: ', err);
	}
}

await main();
