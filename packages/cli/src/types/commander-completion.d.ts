declare module "commander-completion" {
  import commander from "commander";

  export type LineInfo = {
    line: {
      value: string,
      index: number,
      partialLeft: string,
      partialRight: string,
    },
    words: {
      value: string,
      index: number,
      partialLeft: string,
      partialRight: string
    },
    word: {
      value: string,
      index: number,
      partialLeft: string,
      partialRight: string
    }
  };

  export type CompletionCallback = (err: string, results: string[]) => void;
  export type CompleteFunction = (
    params: { line: string, cursor: number | string },
    cb?: CompletionCallback
  ) => ComplitingCommand; // eslint-disable-line no-use-before-define
  export type CompletionFunction = (info: LineInfo, cb?: CompletionCallback) => ComplitingCommand; // eslint-disable-line no-use-before-define

  export class ComplitingCommand extends commander.Command {
      complete: CompleteFunction;
      completion: CompletionFunction;
  }

  type CommanderDefaultExport = typeof commander;

  export default function (c: CommanderDefaultExport) : CommanderDefaultExport & { Command: ComplitingCommand };
}

