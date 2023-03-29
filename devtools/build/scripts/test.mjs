import jest from 'jest-cli';
import kleur from 'kleur';
import { join } from 'path';

async function findJestConfig(helper) {
	const dir = helper.package.dir;
	return helper.findExistingFiles([
		join(dir, 'jest.config.mjs'),
		join(dir, 'jest.config.cjs'),
		join(dir, 'jest.config.js'),
	]);
}

export default async function test(helper, args) {
	const jestConfigs = await findJestConfig(helper);
	const jestArgs = [...args];

	helper.info(`Running tests for ${kleur.cyan(helper.package.name)}.`);
	if (jestConfigs.length > 0) {
		helper.info(`Using config file \`${kleur.dim(jestConfigs[0])}\`.`);
		args.push(`--config=${jestConfigs[0]}`);
	} else {
		args.push(`--config=${helper.buildtools}/jest.config.js`);
	}

	jest.run(jestArgs, helper.package.dir);
}
