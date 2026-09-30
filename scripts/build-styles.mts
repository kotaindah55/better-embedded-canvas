import process from 'node:process';
import fsPromises from 'node:fs/promises';
import childProcess from 'node:child_process';
import * as sass from 'sass';
import sassConfig from './configs/sass.config.mjs';
import { at } from './utils/directory-util.mjs';

const dev = process.argv[2] === 'dev';
const entry = at('styles/main.scss');
const output = at('dist/styles.css');

async function main(): Promise<void> {
	if (dev) {
		const watcher = childProcess.spawn('sass', [
			'--watch',
			sassConfig.sourceMap ? '--embed-source-map' : '--no-source-map',
			`--style=${sassConfig.style ?? 'expanded'}`,
			entry,
			output
		]);

		watcher.stdout.on('data', data => {
			if (data instanceof Buffer) {
				console.log(String(data).trimEnd());
			}
		});

		watcher.on('close', () => close(undefined));
		let close: (value: unknown) => void;
		await new Promise(resolve => close = resolve);
	}

	else {
		const data = sass.compile(entry, sassConfig);
		await fsPromises.writeFile(output, data.css);
	}
}

await main();
