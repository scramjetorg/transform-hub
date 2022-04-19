import { ReadableApp } from "@scramjet/types";
declare type Arguments = [string, number, {
    abc: string;
}, [string]];
declare const exp: ReadableApp<string, Arguments>;
export default exp;
