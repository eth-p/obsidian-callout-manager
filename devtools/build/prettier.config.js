module.exports = {
	printWidth: 120,
	tabWidth: 4,
	useTabs: true,
	trailingComma: 'all',
	singleQuote: true,
	semi: true,

	importOrder: ['^(?!obsidian|&|\\.{1,2}/).+', '^obsidian', '^&(?!ui)', '^&ui', '^\\.\\./', '^\\./'],
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,
};
