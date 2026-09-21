import process from 'node:process';
import esbuild from 'esbuild';
import esbuildConfig from './configs/esbuild.config.mjs';

async function main(): Promise<void> {
	let dev = process.argv[2] === 'dev';
	let context = await esbuild.context(esbuildConfig);

	if (dev) {
		await context.watch();
	} else {
		await context.rebuild();
		process.exit(0);
	}
}

await main();