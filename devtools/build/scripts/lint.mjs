import {run as runEslint} from "./run-eslint.mjs";
import {run as runTsc} from "./run-tsc.mjs";

export default async function test(helper, args) {
	const files = await helper.getPackageSources();
	if (files.length < 1) {
		helper.warn('Nothing to lint.');
		return;
	}

	runEslint(helper, ['--', ...files], false);
	runTsc(helper, ['--noEmit', '--skipLibCheck'])
}
