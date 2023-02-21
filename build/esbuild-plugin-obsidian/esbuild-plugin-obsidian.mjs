import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { cwd } from 'process';

export default function esbuildObsidian(options) {
	const { packageJson, manifestFile, versionsFile, outdir } = {
		packageJson: join(cwd(), 'package.json'),
		outdir: undefined,
		...(options ?? {})
	};

	function destinationFile(build, variable, name) {
		if (variable != null) return variable;
		const dir = outdir ?? build.initialOptions.outdir ?? dirname(build.initialOptions.outfile);
		return join(dir, name);
	}

	return {
		name: 'obsidian-manifest',
		setup(build) {
			build.onStart(async () => {
				const pkg = JSON.parse(await readFile(packageJson, 'utf8'));

				const manifestJsonFile = destinationFile(build, manifestFile, 'manifest.json');
				const versionsJsonFile = destinationFile(build, versionsFile, 'versions.json');

				await ensureDir(dirname(manifestJsonFile));
				await ensureDir(dirname(versionsJsonFile));
				await Promise.all([
					writeFile(manifestJsonFile, createManifest(pkg)),
					writeFile(versionsJsonFile, await updateVersions(pkg, versionsJsonFile)),
				]);
			});
		},
	};
}

async function ensureDir(dir) {
	if (!(await access(dir).catch(() => false))) {
		await mkdir(dir, { recursive: true });
	}
}

function createManifest(packageJsonData) {
	return JSON.stringify(
		{
			id: packageJsonData.name,
			version: packageJsonData.version,
			description: packageJsonData.description,
			author: packageJsonData.author.name,
			authorUrl: packageJsonData.author.url,
			...packageJsonData.obsidianPlugin,
		},
		null,
		'\t',
	);
}

async function updateVersions(packageJsonData, file) {
	const versions = (await access(file).catch(() => false)) ? JSON.parse(await readFile(file, 'utf8')) : {};

	versions[packageJsonData.version] = packageJsonData.obsidianPlugin.minAppVersion;

	return JSON.stringify(versions, null, '\t');
}
