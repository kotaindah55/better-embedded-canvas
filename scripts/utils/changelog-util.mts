import fsPromises from 'node:fs/promises'
import { at } from './directory-util.mjs';

export interface ChangelogDesc {
	version: string;
	text: string;
}

export async function getLastChangelog(): Promise<ChangelogDesc> {
	let file = await fsPromises.open(CHANGELOG_PATH, 'r');
	let text = '';
	let version = '';
	let lineIdx = 0;

	for await (let line of file.readLines({ encoding: 'utf-8' })) {
		if (!version) {
			if (lineIdx === 0) version = CHANGELOG_VERSION.exec(line)?.[1] ?? '';
			if (!version) {
				await file.close();
				throw Error('Invalid changelog version format');
			}
		}

		else {
			if (line === CHANGELOG_DELIM) {
				await file.close();
				break;
			}
			text += line + '\n';
		}
	}

	return { text, version };
}

const CHANGELOG_PATH = at('CHANGELOGS.txt');
const CHANGELOG_DELIM = '---';
const CHANGELOG_VERSION = /^\[(\d+\.\d+\.\d+)\]$/;