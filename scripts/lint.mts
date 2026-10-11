import { ESLint } from 'eslint';
import { rootAsCwd } from './utils/directory-util.mjs';

async function main(): Promise<void> {
	rootAsCwd();

	const autoFix = process.argv[2] === 'auto-fix';
	const lintTarget = ['src/**', 'scripts/**'];

	const eslint = new ESLint();
	const results = await eslint.lintFiles(lintTarget);
	if (autoFix) await ESLint.outputFixes(results);

	const formatter = await eslint.loadFormatter('stylish');
	const resultText = formatter.format(results);
	console.log(resultText);
}

await main();
