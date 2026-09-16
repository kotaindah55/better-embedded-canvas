import { open, readFile } from 'fs/promises';
import { compareVersions } from 'compare-versions';

interface ChangelogDesc {
	version: string;
	changelog: string;
}

const VERSION_VALIDATOR = /^\[(\d+\.\d+\.\d+)\]$/;
const END_OF_CHANGELOG = /^---$/;

export async function getLastChangelog(): Promise<ChangelogDesc> {
	let changelogFile = await open('CHANGELOGS.txt', 'r'),
		changelog = '',
		version = '',
		lineIndex = 0;

	for await (let line of changelogFile.readLines({
		encoding: 'utf-8',
	})) {
		if (!version) {
			if (!lineIndex) version = VERSION_VALIDATOR.exec(line)?.[1] ?? '';
			if (!version) {
				await changelogFile.close();
				throw Error('Not a valid version token!');
			}
		}

		else {
			if (END_OF_CHANGELOG.test(line)) {
				await changelogFile.close();
				break;
			}
			changelog += line + '\n';
		}
	}

	return { changelog, version };
}

export async function isNewestVersion(version: string): Promise<boolean> {
	if (!VERSION_VALIDATOR.test(version)) return false;

	let rawManifest = (await readFile('manifest.json')).toString(),
		manifest = JSON.parse(rawManifest) as { version: string };

	if (!manifest?.version || !VERSION_VALIDATOR.test(manifest.version)) return false;

	return compareVersions(version, manifest.version) > 0;
}