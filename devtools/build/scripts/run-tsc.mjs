import { execFileSync } from 'child_process';
import kleur from 'kleur';
import { exit } from 'process';

export async function run(helper, args, quiet) {
	const tscArgs = [...args];
	const print = quiet ? () => {} : helper.info.bind(helper);

	print(`Checking types in ${kleur.cyan(helper.package.name)}.`);

	try {
		execFileSync('tsc', [...tscArgs], {
			stdio: 'inherit',
		});
	} catch (ex) {
		exit(ex.status);
	}
}

export default async function runTsc(helper, args) {
	run(helper, args, true);
}
