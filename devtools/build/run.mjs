#!/usr/bin/env node
import { access } from 'fs/promises';
import { dirname } from 'path';
import { argv, env } from 'process';

import Helper from './helper.mjs';

// Load.
const helper = new Helper(env.npm_package_json, dirname(new URL(import.meta.url).pathname));
const scriptValidation = /^[a-z-]+$/;
const script = argv[2]?.toLowerCase();
const args = argv.slice(3);

async function loadScript() {
	const scriptPath = `${helper.buildtools}/scripts/${script}.mjs`;
	if (scriptValidation.test(script)) {
		let exists = false;

		try {
			await access(scriptPath);
			exists = true;
		} catch (_err) {
			// Probably file not found.
			console.log(_err);
		}

		if (exists) {
			return await import(scriptPath);
		}
	}

	helper.fatal('Unknown build script: `%s`', script);
}

// Main.
try {
	const scriptModule = await loadScript();
	await scriptModule.default(helper, args);
} catch (err) {
	helper.fatal('Unexpected', err);
}
