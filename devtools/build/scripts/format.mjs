import { run } from './run-prettier.mjs';

export default async function test(helper, args) {
	const files = await helper.getPackageSources();
	if (files.length < 1) {
		helper.warn('Nothing to format.');
		return;
	}

	const isCheck = args.includes('--check') || args.includes('-c');
	const extraArgs = isCheck ? [] : ['--write'];

	// Run prettier.
	run(helper, [...args, ...extraArgs, ...files], false);
}
