import { defineConfig } from 'eslint/config';
import globals from 'globals';
import eslint, { meta } from '@eslint/js';
import tslint from 'typescript-eslint';
import obsidianmdlint from 'eslint-plugin-obsidianmd';
import jsdoclint from 'eslint-plugin-jsdoc';
import tsParser from '@typescript-eslint/parser';

export default defineConfig(
	eslint.configs.recommended,
	tslint.configs.recommendedTypeChecked,
	jsdoclint.configs['flat/logical-typescript'],
	[
		...obsidianmdlint.configs?.recommendedWithLocalesEn,
		{
			ignores: [
				'**/.deprecated/',
				'**/@external',
				'**/node_modules/',
				'**/libs/',
				'**/dist/',
				'**/main.js',
				'**/esbuild.config.mjs',
				'**/eslint.config.mjs'
			],
			languageOptions: {
				globals: { ...globals.node },
				parser: tsParser,
				parserOptions: {
					projectService: true,
					tsconfigRootDir: import.meta.url
				},
				ecmaVersion: 'latest',
				sourceType: 'module'
			},
			rules: {
				'prefer-const': 'off',
				'no-unused-vars': 'off',
				'no-unused-labels': 'off',
				'no-undef': 'off',
				'no-prototype-builtins': 'off',
				'no-cond-assign': 'off',
				'jsdoc/no-undefined-types': 1,
				'obsidianmd/ui/sentence-case': {
					ignoreRegex: ['“[\w\d_-]+”']
				},
				'@typescript-eslint/unbound-method': 'off',
				'@typescript-eslint/no-empty-function': 'off',
				'@typescript-eslint/await-thenable': 'off',
				'@typescript-eslint/no-unsafe-argument': 'off',
				'@typescript-eslint/no-unsafe-assignment': 'off',
				'@typescript-eslint/no-unsafe-member-access': 'off',
				'@typescript-eslint/no-unsafe-call': 'off',
				'@typescript-eslint/no-unused-vars': [
					'error', { args: 'none' },
				],
			}
		}
	]
);