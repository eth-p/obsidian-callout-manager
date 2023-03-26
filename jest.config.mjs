import { pathsToModuleNameMapper } from 'ts-jest';
import { readFileSync } from 'fs';

const {compilerOptions} = JSON.parse(readFileSync("./tsconfig.json", 'utf8'));

const options = {
	moduleNameMapper: {
		...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
	}
}

export default options;
