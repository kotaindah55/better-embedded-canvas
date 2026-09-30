import { defineConfig } from 'eslint/config';
import globals from 'globals';
import eslint from '@eslint/js';
import tslint from 'typescript-eslint';
import obsidianmdlint from 'eslint-plugin-obsidianmd';
import tsParser from '@typescript-eslint/parser';
import stylistic from '@stylistic/eslint-plugin';

const ignoredFiles = [
	'**/node_modules/',
	'**/libs/',
	'**/dist/',
	'**/*.{js,mjs}'
];

const ignoredWords = [
	'Better Embedded Canvas',
	'“Space”',
	'“Settings → Core plugins”'
];

const stylisticConfig = stylistic.configs.customize({
	blockSpacing: true,
	braceStyle: '1tbs',
	commaDangle: 'never',
	indent: 'tab',
	jsx: false,
	quoteProps: 'consistent-as-needed',
	quotes: 'single',
	semi: true
});

const reconfiguredRules = {
	'no-unused-vars': 'off',
	'one-var': [
		'error',
		'never'
	],
	'prefer-const': 'error',
	'@typescript-eslint/consistent-type-imports': 'error',
	'@typescript-eslint/explicit-function-return-type': [
		'error', { allowExpressions: true }
	],
	'@typescript-eslint/explicit-member-accessibility': 'error',
	'@typescript-eslint/no-confusing-void-expression': [
		'error', {
			ignoreVoidOperator: true,
			ignoreArrowShorthand: true
		}
	],
	'@typescript-eslint/no-empty-function': 'off',
	'@typescript-eslint/no-import-type-side-effects': 'error',
	'@typescript-eslint/no-unused-vars': [
		'error', { argsIgnorePattern: '^_' }
	],
	'@typescript-eslint/prefer-readonly': 'error',
	'@typescript-eslint/restrict-template-expressions': [
		'error', { allowNumber: true }
	],
	'@stylistic/arrow-parens': [
		'error', 'as-needed'
	],
	'@stylistic/brace-style': 'off',
	'@stylistic/no-mixed-operators': 'off',
	'@stylistic/no-trailing-spaces': [
		'error', { ignoreComments: true }
	],
	'@stylistic/operator-linebreak': [
		'error', 'after', {
			overrides: {
				'?': 'before',
				':': 'before',
				'|': 'before'
			}
		}
	]
};

const reconfiguredLangOptions = {
	parser: tsParser,
	parserOptions: {
		projectService: true,
		tsconfigRootDir: import.meta.dirname
	},
	ecmaVersion: 'latest',
	sourceType: 'module'
};

const scriptLinter = {
	files: [
		'scripts/**/*.{ts,mts}'
	],
	ignores: ignoredFiles,
	extends: [
		eslint.configs.recommended,
		...tslint.configs.strictTypeChecked,
		...tslint.configs.stylisticTypeChecked,
		stylisticConfig
	],
	languageOptions: {
		...reconfiguredLangOptions,
		globals: { ...globals.node }
	},
	rules: reconfiguredRules
};

const sourceLinter = {
	files: [
		'src/**/*.ts'
	],
	ignores: ignoredFiles,
	extends: [
		stylisticConfig,
		...obsidianmdlint.configs.recommended
	],
	languageOptions: {
		...reconfiguredLangOptions,
		globals: {
			i18next: 'readonly'
		}
	},
	rules: {
		...reconfiguredRules,
		'obsidianmd/ui/sentence-case': [
			'error', { brands: [...ignoredWords] }
		],
		'obsidianmd/ui/sentence-case-locale-module': [
			'error', { brands: [...ignoredWords] }
		]
	}
};

export default defineConfig(scriptLinter, sourceLinter);