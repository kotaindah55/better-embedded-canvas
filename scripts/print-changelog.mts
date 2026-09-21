import fsPromises from 'node:fs/promises';
import { type ChangelogDesc, getLastChangelog } from './utils/changelog-util.mjs';
import { at } from './utils/directory-util.mjs';
import { getManifest } from './utils/config-util.mjs';

async function validate(changelog: ChangelogDesc): Promise<boolean> {
	let manifest = await getManifest();
	return manifest.version === changelog.version;
}

async function print(changelog: ChangelogDesc): Promise<void> {
	await fsPromises.writeFile(at('CHANGELOG.md'), changelog.text);
}

async function main(): Promise<void> {
	let changelog = await getLastChangelog();
	if (await validate(changelog)) {
		await print(changelog);
	} else {
		throw Error('Manifest version doesn\'t match with the changelog');
	}
}

await main();