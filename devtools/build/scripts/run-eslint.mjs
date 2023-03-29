import { execFileSync } from 'child_process';
import kleur from 'kleur';
import { exit } from 'process';

export async function run(helper, args, quiet) {
	const eslintArgs = [...args];
	const print = quiet ? () => {} : helper.info.bind(helper);

	print(`Linting code in ${kleur.cyan(helper.package.name)}.`);

	try {
		execFileSync('eslint', [...eslintArgs], {
			stdio: 'inherit',
		});
	} catch (ex) {
		exit(ex.status);
	}
}

export default async function runEslint(helper, args) {
	run(helper, args, true);
}
