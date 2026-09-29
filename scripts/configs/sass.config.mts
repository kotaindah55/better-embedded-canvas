import process from 'node:process';
import type * as sass from 'sass';

const dev = process.argv[2] === 'dev';

export default {
	style: dev ? 'expanded' : 'compressed',
	sourceMap: false 
} as sass.Options<'sync'>;