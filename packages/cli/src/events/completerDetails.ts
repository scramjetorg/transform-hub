export type CompleterParams = string[] | "filenames" | "dirnames";
export type ArgumentOrOptionName = string;
export type CommandCompleterDetails = Record<ArgumentOrOptionName, CompleterParams>;

export const CompleterDetailsEvent = "CompleterDetails";
export type CompleterDetailsCallback = ({}: CommandCompleterDetails) => void;
