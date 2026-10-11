/** @typedef { import('eslint').Linter.LanguageOptions } LanguageOptions */
/** @typedef { import('eslint/config').ConfigObject } ConfigObject */
/** @typedef { import('@typescript-eslint/parser').ParserOptions } ParserOptions */
/** @typedef { Exclude<import('eslint/config').ConfigObject['rules'], undefined> } RulesConfig */
/** @typedef { Exclude<import('eslint/config').ConfigObject['plugins'], undefined> } Plugins */
/** @typedef { Exclude<import('eslint/config').ConfigObject['settings'], undefined> } Settings */

import { defineConfig } from 'eslint/config';
import globals from 'globals';
import jsLint from '@eslint/js';
import tsLint from 'typescript-eslint';
import obsidianmdLint from 'eslint-plugin-obsidianmd';
import stylisticLint from '@stylistic/eslint-plugin';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import tsParser from '@typescript-eslint/parser';

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

const stylisticConfig = stylisticLint.configs.customize({
	blockSpacing: true,
	braceStyle: '1tbs',
	commaDangle: 'never',
	indent: 'tab',
	jsx: false,
	quoteProps: 'consistent-as-needed',
	quotes: 'single',
	semi: true
});

/**
 * @type { RulesConfig }
 */
const reconfiguredRules = {
	'arrow-body-style': [
		'error', 'as-needed'
	],
	'default-case-last': 'error',
	'grouped-accessor-pairs': [
		'error', 'getBeforeSet', { enforceForTSTypes: true }
	],
	'no-constructor-return': 'error',
	'no-duplicate-imports': [
		'error', { allowSeparateTypeImports: true }
	],
	'no-extra-boolean-cast': [
		'error', { enforceForInnerExpressions: true }
	],
	'no-multi-assign': 'error',
	'no-new-wrappers': 'error',
	'no-object-constructor': 'error',
	'no-sequences': 'error',
	'no-undef-init': 'error',
	'no-unused-vars': 'off',
	'no-useless-call': 'error',
	'one-var': [
		'error', 'never'
	],
	'prefer-const': 'error',
	'@typescript-eslint/consistent-type-imports': [
		'error', { fixStyle: 'inline-type-imports' }
	],
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
	'@stylistic/array-bracket-newline': [
		'error', { multiline: true }
	],
	'@stylistic/array-bracket-spacing': [
		'error', 'never'
	],
	'@stylistic/arrow-parens': [
		'error', 'as-needed'
	],
	'@stylistic/brace-style': 'off',
	'@stylistic/curly-newline': [
		'error', { consistent: true }
	],
	'@stylistic/function-call-argument-newline': [
		'error', 'consistent'
	],
	'@stylistic/function-call-spacing': [
		'error', 'never'
	],
	'@stylistic/implicit-arrow-linebreak': [
		'error', 'beside'
	],
	'@stylistic/no-extra-semi': 'error',
	'@stylistic/no-mixed-operators': 'off',
	'@stylistic/no-trailing-spaces': [
		'error', { ignoreComments: true }
	],
	'@stylistic/object-curly-newline': [
		'error', {
			consistent: true,
			multiline: true
		}
	],
	'@stylistic/object-curly-spacing': [
		'error', 'always', { emptyObjects: 'never' }
	],
	'@stylistic/operator-linebreak': [
		'error', 'after', {
			overrides: {
				'?': 'before',
				':': 'before',
				'|': 'before'
			}
		}
	],
	'@stylistic/switch-colon-spacing': 'error',
	'jsdoc/check-alignment': [
		'error', { ignoreEmptyLines: false }
	],
	'jsdoc/check-indentation': [
		'error', {
			allowIndentedSections: true,
			excludeTags: ['example']
		}
	],
	'jsdoc/check-param-names': [
		'error', {
			checkDestructured: false,
			disableExtraPropertyReporting: true,
			disableMissingParamChecks: true,
			enableFixer: true
		}
	],
	'jsdoc/no-bad-blocks': 'error',
	'jsdoc/no-blank-block-descriptions': 'error',
	'jsdoc/no-blank-blocks': [
		'error', { enableFixer: true }
	],
	'jsdoc/no-multi-asterisks': [
		'error', { allowWhitespace: true }
	]
};

/**
 * @type { LanguageOptions & { parserOptions?: ParserOptions } }
 */
const reconfiguredLangOptions = {
	parser: tsParser,
	parserOptions: {
		projectService: true,
		tsconfigRootDir: import.meta.dirname
	},
	ecmaVersion: 'latest',
	sourceType: 'module'
};

/**
 * @type { Plugins }
 */
const plugins = {
	jsdoc: jsdocPlugin
};

/**
 * @type { Settings }
 */
const settings = {
	jsdoc: { mode: 'typescript' }
};

/**
 * @type { ConfigObject }
 */
const scriptLinter = {
	plugins,
	settings,
	files: [
		'scripts/**/*.{ts,mts}'
	],
	ignores: ignoredFiles,
	extends: [
		jsLint.configs.recommended,
		...tsLint.configs.strictTypeChecked,
		...tsLint.configs.stylisticTypeChecked,
		stylisticConfig
	],
	languageOptions: {
		...reconfiguredLangOptions,
		globals: { ...globals.node }
	},
	rules: reconfiguredRules
};

/**
 * @type { ConfigObject }
 */
const sourceLinter = {
	plugins,
	settings,
	files: [
		'src/**/*.ts'
	],
	ignores: ignoredFiles,
	extends: [
		stylisticConfig,
		...obsidianmdLint.configs.recommended
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