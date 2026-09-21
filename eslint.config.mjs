import { defineConfig } from 'eslint/config';
import globals from 'globals';
import eslint from '@eslint/js';
import tslint from 'typescript-eslint';
import obsidianmdlint from 'eslint-plugin-obsidianmd';
import tsParser from '@typescript-eslint/parser';

const ignored = [
	'**/node_modules/',
	'**/libs/',
	'**/dist/',
	'**/*.{js,mjs}'
];

const mainLintConfig = {
	files: [
		'**/*.{ts,mts}'
	],
	ignores: ignored,
	extends: [
		eslint.configs.recommended,
		...tslint.configs.strictTypeChecked,
		...tslint.configs.stylisticTypeChecked
	],
	languageOptions: {
		globals: { ...globals.node },
		parser: tsParser,
		parserOptions: {
			projectService: true,
			tsconfigRootDir: import.meta.dirname
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
		'@typescript-eslint/no-empty-function': 'off',
		'@typescript-eslint/await-thenable': 'off',
		'@typescript-eslint/no-unsafe-argument': 'off',
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unsafe-member-access': 'off',
		'@typescript-eslint/no-unsafe-call': 'off',
		'@typescript-eslint/no-unused-vars': [
			'error', { args: 'none' },
		],
		'@typescript-eslint/no-confusing-void-expression': [
			'error', {
				ignoreVoidOperator: true,
				ignoreArrowShorthand: true
			}
		],
		'@typescript-eslint/no-non-null-assertion': 'warn'
	}
};

const obsidianLintConfig = {
	files: [
		'src/*.ts'
	],
	ignores: ignored.concat([
		'scripts/',
		'**/*.d.ts'
	]),
	extends: [
		...obsidianmdlint.configs.recommended
	],
	rules: {
		'obsidianmd/ui/sentence-case': [
			'error', { brands: [
				'Mainstream Icons'
			]}
		],
		'obsidianmd/ui/sentence-case-locale-module': [
			'error', { brands: [
				'Mainstream Icons'
			]}
		]
	}
};

export default defineConfig(mainLintConfig, obsidianLintConfig);