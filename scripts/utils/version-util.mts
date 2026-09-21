export function isValidVersion(version: string): boolean {
	return VERSION_VALIDATOR.test(version);
}

const VERSION_VALIDATOR = /^\d+\.\d+\.\d+$/y;