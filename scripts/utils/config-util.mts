import fsPromises from 'node:fs/promises';
import type { PluginManifest } from 'obsidian';
import { at } from './directory-util.mjs';

export type VersionHistory = Record<string, string>;

export interface PackageConfig {
	name: string;
	version: string;
	dependencies: Record<string, string>;
}

export async function dependencyVersion(dep: string): Promise<string | null> {
	const packageJson = await getPackageConfig();
	return packageJson.dependencies[dep] ?? null;
}

export async function getPackageConfig(): Promise<PackageConfig> {
	const rawJson = await fsPromises.readFile(at('package.json'), 'utf-8');
	return JSON.parse(rawJson) as PackageConfig;
}

export async function getManifest(): Promise<PluginManifest> {
	const raw = await fsPromises.readFile(at('manifest.json'), 'utf-8');
	return JSON.parse(raw) as PluginManifest;
}

export async function getVersionHistory(): Promise<VersionHistory> {
	const raw = await fsPromises.readFile(at('versions.json'), 'utf-8');
	return JSON.parse(raw) as VersionHistory;
}

export async function updatePackageConfig(conf: PackageConfig): Promise<void> {
	await fsPromises.writeFile(at('package.json'), JSON.stringify(conf, undefined, '\t'));
}

export async function updateManifest(conf: PluginManifest): Promise<void> {
	await fsPromises.writeFile(at('manifest.json'), JSON.stringify(conf, undefined, '\t'));
}

export async function updateVersionHistory(conf: VersionHistory): Promise<void> {
	await fsPromises.writeFile(at('versions.json'), JSON.stringify(conf, undefined, '\t'));
}
