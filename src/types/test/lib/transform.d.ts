import { ReadableStream } from "../../runner";

declare function exports(str: ReadableStream<{x?: number; y?: number}>): ReadableStream<{z: number}>;
export default exports;