import path from 'node:path';
import process from 'node:process';

export function at(path: string): string {
	if (/^\.*\//y.test(path)) throw Error('Path must not start with "/", "./" or "../"');
	return `${ROOT_DIR}/${path}`;
}

export function rootAsCwd(): void {
	if (process.cwd() == ROOT_DIR) return;
	process.chdir(ROOT_DIR);
}

const ROOT_DIR = path.dirname(path.dirname(import.meta.dirname));
