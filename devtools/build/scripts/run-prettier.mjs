import kleur from 'kleur';
import { join } from 'path';
import prettier from 'prettier/cli.js';

async function findPrettierConfig(helper) {
	const dir = helper.package.dir;
	const files = await helper.findExistingFiles([join(dir, '.prettierrc'), join(dir, 'prettier.config.js')]);

	if (files.length === 0) {
		if ('prettier' in helper.package.json) {
			return Object.assign([helper.package.json], { fromPackageJson: true });
		}
	}

	return files;
}

export async function run(helper, args, quiet) {
	const prettierConfigs = await findPrettierConfig(helper);
	const prettierArgs = [...args];

	const print = quiet ? () => {} : helper.info.bind(helper);
	const isWrite = args.includes('--write') || args.includes('-w');

	print(`${isWrite ? 'Formatting' : 'Checking format of'} code in ${kleur.cyan(helper.package.name)}.`);
	if (prettierConfigs.length > 0) {
		if (!prettierConfigs.fromPackageJson) {
			print(`Using config file \`${kleur.dim(prettierConfigs[0])}\`.`);
			args.push(`--config=${prettierConfigs[0]}`);
		} else {
			print(`Using config from package.json.`);
		}
	} else {
		args.push(`--config=${helper.buildtools}/prettier.config.js`);
	}

	prettier.run(prettierArgs);
}

export default async function runPrettier(helper, args) {
	run(helper, args, true);
}
