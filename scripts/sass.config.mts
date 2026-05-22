import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';
import process from 'process';
import * as sass from 'sass';

const prod = (process.argv[2] === 'production');
const conf = {
	entry: 'styles/main.scss',
	output: prod ? 'dist/styles.css' : 'dist/styles.css',
	style: prod ? 'compressed' as const : 'expanded' as const
};

if (prod) {
	const compiled = sass.compile(
		conf.entry,
		{ style: conf.style }
	);
	await writeFile(conf.output, compiled.css, 'utf-8');
	process.exit(0);
} else {
	const sassWatch = spawn('sass', ['--no-source-map', '--watch', conf.entry, conf.output]);
	sassWatch.stdout.on('data', data => {
		if (data instanceof Buffer) {
			console.log(data.toString().trimEnd());
		}
	});
}