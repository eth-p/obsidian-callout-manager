export type Callout = CalloutBase & (CustomCallout | BuiltinCallout | DetectedCallout);
export default Callout;

interface CalloutBase {
	id: string;
	name: string;
	color: string;
	aliases: string;

	customCSS: string;
}

export interface CustomCallout extends CalloutBase {
	type: "custom";
	colorDark: string;
	colorLight: string;
}

export interface BuiltinCallout extends CalloutBase {
	type: "builtin";
	hidden: boolean;
}

export interface DetectedCallout extends CalloutBase {
	type: "detected";
	hidden: boolean;
}
