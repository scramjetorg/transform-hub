/**
 * Native Scramjet CLI Command Model.
 *
 * Replaces Commander with Scramjet-owned descriptors and a small runner.
 * No Commander dependency, no Commander drop-in classes.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CompleterParams = string[] | "filenames" | "dirnames";

export class CommandUsageError extends Error {
    readonly code = "COMMAND_USAGE_ERROR";
    constructor(message: string) {
        super(message);
        this.name = "CommandUsageError";
    }
}

function usageError(message: string): never {
    throw new CommandUsageError(message);
}

export interface OptionDescriptor {
    name: string;
    flag?: string;
    description?: string;
    short?: string;
    aliases?: readonly string[];
    type?: "string" | "number" | "boolean" | "string[]" | "number[]" | "json";
    default?: unknown;
    choices?: readonly string[];
    required?: boolean;
    negatable?: boolean;
    parse?: (value: string) => unknown;
    /** Key used in completer details lookup (defaults to name) */
    completerKey?: string;
}

export interface ArgumentDescriptor {
    name: string;
    description?: string;
    required?: boolean;
    default?: unknown;
    choices?: readonly string[];
    parse?: (value: string) => unknown;
}

export type CommandAction = (...args: any[]) => Promise<void> | void;

export interface CommandHooks {
    preAction?: (thisContext: CommandContext) => Promise<void> | void;
    postAction?: (thisContext: CommandContext) => Promise<void> | void;
}

export interface CommandContext {
    /** The resolved leaf command descriptor */
    command: CommandDescriptor;
    /** Parsed option values keyed by option name */
    options: Record<string, unknown>;
    /** Positional argument values in declaration order */
    args: unknown[];
    /** Raw argv tokens (excluding "si" and resolved command path) */
    rawTokens: string[];
}

export interface CommandDescriptor {
    name: string;
    alias?: string;
    description?: string;
    hidden?: boolean;
    usage?: string;
    arguments?: ArgumentDescriptor[];
    options?: OptionDescriptor[];
    hooks?: CommandHooks;
    /** Per-argument/per-option completer metadata emitted via event */
    completerMeta?: Record<string, CompleterParams>;
    children?: CommandDescriptor[];
    action?: CommandAction;
    /** Arbitrary metadata for extenders (e.g., { developersOnly: true }) */
    metadata?: Record<string, unknown>;
}

export interface ResolveResult {
    /** The leaf (deepest matching) descriptor */
    command: CommandDescriptor;
    /** All descriptors along the path, root first */
    path: CommandDescriptor[];
    /** Tokens consumed as command names (including root) */
    consumed: string[];
    /** Remaining tokens after command path (options + positional args) */
    remainder: string[];
}

// ---------------------------------------------------------------------------
// Command tree resolution
// ---------------------------------------------------------------------------

/**
 * Walk argv left-to-right matching command names/aliases to build a path.
 * Stops at the first token that is not a known command or alias.
 */
export function resolveCommandPath(argv: readonly string[], root: CommandDescriptor): ResolveResult {
    const consumed: string[] = [];
    const path: CommandDescriptor[] = [];
    let current = root;

    // Skip binary name (argv[0] is "si", argv[1] may be the first command)
    const tokens = argv[0] === "si" || argv[0] === root.name ? argv.slice(1) : [...argv];
    consumed.push(root.name);

    path.push(current);

    for (const token of tokens) {
        if (!current.children) break;

        const child = current.children.find((c) => c.name === token || c.alias === token);

        if (!child) {
            if (token === "--help" || token === "-h" || token.startsWith("-")) break;
            usageError(`Unknown subcommand for command "${current.name}"`);
        }

        consumed.push(token);
        path.push(child);
        current = child;
    }

    const remainder = tokens.slice(consumed.length - 1); // -1 because consumed includes root

    return { command: current, path, consumed, remainder };
}

// ---------------------------------------------------------------------------
// Option parsing (delegates to cac internally, no cac types in public API)
// ---------------------------------------------------------------------------

/**
 * Parse remaining tokens as options + positional args for a resolved command.
 * Returns a context ready for action execution.
 */
export function parseCommandContext(resolve: ResolveResult, globalOptions?: OptionDescriptor[]): CommandContext {
    const allOptions = [...(globalOptions || []), ...(resolve.command.options || [])];

    const options: Record<string, unknown> = {};
    allOptions.forEach((opt) => {
        if (opt.default !== undefined) options[opt.name] = opt.default;
    });

    const optionValueIndexes = new Set<number>();
    const seenScalarOptions = new Set<string>();
    const positionalTokens: string[] = [];
    let endOfOptions = false;

    resolve.remainder.forEach((token, index) => {
        if (optionValueIndexes.has(index)) return;

        if (endOfOptions) {
            positionalTokens.push(token);
            return;
        }
        if (token === "--") {
            endOfOptions = true;
            return;
        }
        const [optionName, inlineValue] = token.split("=", 2);
        const option = allOptions.find((candidate) => optionTokens(candidate).includes(optionName));

        if (!option) {
            if (token === "-" || !token.startsWith("-")) positionalTokens.push(token);
            else usageError(`Unknown option for command "${resolve.command.name}"`);
            return;
        }

        const isArray = option.type === "string[]" || option.type === "number[]";
        if (!isArray && seenScalarOptions.has(option.name)) usageError(`Duplicate option "--${option.flag || option.name}"`);
        if (!isArray) seenScalarOptions.add(option.name);

        if (optionName.startsWith("--no-") && option.type === "boolean") {
            options[option.name] = false;
            return;
        }

        if (option.type === "boolean") {
            options[option.name] = true;
            return;
        }

        const rawValue = inlineValue !== undefined ? inlineValue : resolve.remainder[index + 1];

        if (rawValue === undefined || (inlineValue === undefined && rawValue.startsWith("-") && option.type !== "number")) {
            usageError(`Missing value for option "--${option.flag || option.name}"`);
        }

        if (inlineValue === undefined) {
            optionValueIndexes.add(index + 1);
        }

        const coerced = coerceOptionValue(rawValue, option);
        options[option.name] = isArray && Array.isArray(options[option.name]) ? [...(options[option.name] as unknown[]), ...(coerced as unknown[])] : coerced;
    });

    // Map positional tokens to argument descriptors
    const args: unknown[] = [];
    const argDefs = resolve.command.arguments || [];

    for (let i = 0; i < argDefs.length; i++) {
        const argDef = argDefs[i];
        const value = positionalTokens[i];

        if (value !== undefined) {
            let coerced: unknown;
            try {
                coerced = argDef.parse ? argDef.parse(value) : coerceArgValue(value, argDef);
            } catch {
                usageError(`Invalid value for argument "${argDef.name}"`);
            }
            const validated = argDef.choices && typeof coerced === "string" ? validateChoice(coerced, argDef.choices) : coerced;
            args.push(validated);
        } else if (argDef.default !== undefined) {
            args.push(argDef.default);
        } else if (!argDef.required) {
            args.push(undefined);
        } else {
            usageError(`Missing required argument "${argDef.name}" for command "${resolve.command.name}"`);
        }
    }

    if (positionalTokens.length > argDefs.length) {
        usageError(`Unexpected positional argument for command "${resolve.command.name}"`);
    }

    for (const option of allOptions) {
        if (option.required && options[option.name] === undefined) usageError(`Missing required option "--${option.flag || option.name}" for command "${resolve.command.name}"`);
    }

    return {
        command: resolve.command,
        options,
        args,
        rawTokens: resolve.remainder
    };
}

function coerceArgValue(value: string, _arg: ArgumentDescriptor): string {
    return value; // Keep as string; caller handles further coercion
}

function validateChoice(value: string, choices: readonly string[]): string {
    if (!choices.includes(value)) {
        usageError(`Invalid choice for argument; allowed values: ${choices.join(", ")}`);
    }
    return value;
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

/**
 * Execute a command: run preAction hook, then action, then postAction hook.
 */
export async function executeCommand(ctx: CommandContext): Promise<void> {
    const hooks = ctx.command.hooks;

    if (hooks?.preAction) {
        await hooks.preAction(ctx);
    }

    if (ctx.command.action) {
        await ctx.command.action(...ctx.args, ctx.options);
    }

    if (hooks?.postAction) {
        await hooks.postAction(ctx);
    }
}

// ---------------------------------------------------------------------------
// Help generation
// ---------------------------------------------------------------------------

/**
 * Generate help text for a command from its descriptor.
 */
export function generateHelp(descriptor: CommandDescriptor, programName = descriptor.name): string {
    const lines: string[] = [];

    // Usage
    const usage = descriptor.usage || (descriptor.children && descriptor.children.length > 0 ? "[command] [options...]" : "[options...]");
    lines.push(`Usage: ${programName} ${usage}\n`);

    // Description
    if (descriptor.description) {
        lines.push(`${descriptor.description}\n`);
    }

    // Arguments
    const args = descriptor.arguments || [];
    if (args.length > 0) {
        lines.push("Arguments:\n");
        args.forEach((a) => {
            const optional = a.required ? "" : " (optional)";
            const choices = a.choices && a.choices.length > 0 ? ` [${a.choices.join("|")}]` : "";
            lines.push(`  ${a.name}${choices}${optional}`);
            if (a.description) lines.push(`    ${a.description}`);
            lines.push("");
        });
    }

    // Options
    const opts = descriptor.options || [];
    if (opts.length > 0) {
        lines.push("Options:\n");
        opts.forEach((o) => {
            const short = o.short ? `-${o.short}, ` : "    ";
            const negatable = o.negatable !== false && o.type === "boolean" ? `, --no-${o.name}` : "";
            lines.push(`  ${short}--${o.name}${negatable}  ${o.description || ""}`);
        });
        lines.push("");
    }

    // Subcommands
    const children = descriptor.children || [];
    if (children.length > 0) {
        lines.push("Commands:\n");
        children.forEach((c) => {
            if (c.hidden) return;
            const alias = c.alias ? ` (alias: ${c.alias})` : "";
            lines.push(`  ${c.name}${alias}  ${c.description || ""}`);
        });
        lines.push("");
    }

    return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Top-level run
// ---------------------------------------------------------------------------

/**
 * Parse argv, resolve command path, and execute the matched command.
 * This is the main entry point for running a CLI built from descriptors.
 */
export async function runCommandTree(root: CommandDescriptor, argv: readonly string[], globalOptions?: OptionDescriptor[]): Promise<void> {
    const resolve = resolveCommandPath(argv, root);

    // Handle --help and --version built into the root command
    const hasHelp = argv.includes("--help") || argv.includes("-h");
    const hasVersion = argv.includes("--version") || argv.includes("-v");

    if (hasHelp || (Boolean(resolve.command.children?.length) && resolve.remainder.length === 0)) {
        console.log(generateHelp(resolve.command, resolve.path.map((command) => command.name).join(" ")));
        return;
    }

    if (hasVersion && resolve.command === root) {
        // Version is handled via the root action or argv check
        const versionOpt = (root.options || []).find((o) => o.name === "version");
        if (versionOpt && versionOpt.default) {
            console.log(versionOpt.default);
        }
        return;
    }

    const ctx = parseCommandContext(resolve, globalOptions);

    await executeCommand(ctx);
}

// ---------------------------------------------------------------------------
// Builder helpers
// ---------------------------------------------------------------------------

/**
 * Create a command descriptor using a builder callback pattern.
 * This is the primary way to define commands without Commander.
 *
 * Usage:
 *   const root = cmd("si", (cmd) => {
 *     cmd.desc("CLI tool");
 *     cmd.option("--verbose", "be verbose");
 *     cmd.children(
 *       cmd("config", (c) => {
 *         c.desc("Manage config");
 *         c.action(() => { ... });
 *       })
 *     );
 *   });
 */
export function cmd(name: string, build?: (b: CommandBuilder) => void): CommandDescriptor {
    const descriptor: CommandDescriptor = { name };
    const builder = new CommandBuilder(descriptor);

    if (build) build(builder);

    return descriptor;
}

export class CommandBuilder {
    constructor(private target: CommandDescriptor) {}

    alias(a: string): this {
        this.target.alias = a;
        return this;
    }

    desc(d: string): this {
        this.target.description = d;
        return this;
    }

    hidden(h = true): this {
        this.target.hidden = h;
        return this;
    }

    usage(u: string): this {
        this.target.usage = u;
        return this;
    }

    /** Add an option descriptor */
    option(opt: OptionDescriptor): this;
    /** Shorthand: name + description */
    option(name: string, description?: string, type?: OptionDescriptor["type"]): this;
    option(nameOrOpt: string | OptionDescriptor, description?: string, type?: OptionDescriptor["type"]): this {
        const opt: OptionDescriptor = typeof nameOrOpt === "string" ? parseOptionDescriptor(nameOrOpt, description, type) : nameOrOpt;

        if (!this.target.options) this.target.options = [];
        this.target.options.push(opt);
        return this;
    }

    /** Add an argument descriptor */
    argument(arg: ArgumentDescriptor): this;
    /** Shorthand: name + description */
    argument(name: string, description?: string, required?: boolean): this;
    argument(nameOrArg: string | ArgumentDescriptor, description?: string, required?: boolean): this {
        const arg: ArgumentDescriptor = typeof nameOrArg === "string" ? parseArgumentDescriptor(nameOrArg, description, required) : nameOrArg;

        if (!this.target.arguments) this.target.arguments = [];
        this.target.arguments.push(arg);
        return this;
    }

    /** Set arbitrary metadata (e.g., { developersOnly: true }) */
    meta(key: string, value: unknown): this {
        if (!this.target.metadata) this.target.metadata = {};
        this.target.metadata[key] = value;
        return this;
    }

    /** Set completer metadata */
    completer(meta: Record<string, CompleterParams>): this {
        this.target.completerMeta = {
            ...(this.target.completerMeta || {}),
            ...meta
        };
        return this;
    }

    /** Set the action handler */
    action(fn: CommandAction): this {
        this.target.action = fn;
        return this;
    }

    /** Set pre-action hook */
    preAction(fn: (ctx: CommandContext) => Promise<void> | void): this {
        if (!this.target.hooks) this.target.hooks = {};
        this.target.hooks.preAction = fn;
        return this;
    }

    /** Set post-action hook */
    postAction(fn: (ctx: CommandContext) => Promise<void> | void): this {
        if (!this.target.hooks) this.target.hooks = {};
        this.target.hooks.postAction = fn;
        return this;
    }

    /** Set child commands */
    children(...children: CommandDescriptor[]): this {
        this.target.children = children;
        return this;
    }

    /**
     * Create a subcommand on this descriptor.
     * Returns a new CommandBuilder for the subcommand.
     * This is the native replacement for Commander's `.command()`.
     */
    command(name: string, hidden?: boolean): CommandBuilder {
        const child: CommandDescriptor = { name, hidden };
        if (!this.target.children) this.target.children = [];
        this.target.children.push(child);
        return new CommandBuilder(child);
    }

    /** Add an already-built subcommand descriptor */
    addCommand(child: CommandDescriptor): this {
        if (!this.target.children) this.target.children = [];
        this.target.children.push(child);
        return this;
    }

    /** Build and return the descriptor */
    build(): CommandDescriptor {
        return this.target;
    }
}

/** Shorthand for creating a single option descriptor */
export function opt(name: string, description?: string, type?: OptionDescriptor["type"]): OptionDescriptor {
    return parseOptionDescriptor(name, description, type);
}

/** Shorthand for creating a single argument descriptor */
export function arg(name: string, description?: string, required?: boolean): ArgumentDescriptor {
    return parseArgumentDescriptor(name, description, required);
}

function optionTokens(option: OptionDescriptor): string[] {
    return [
        `--${option.flag || option.name}`,
        ...(option.type === "boolean" && option.negatable ? [`--no-${option.flag || option.name}`] : []),
        ...(option.aliases || []).map((alias) => `--${alias}`),
        ...(option.short ? [`-${option.short}`] : [])
    ];
}

function coerceOptionValue(value: string, option: OptionDescriptor): unknown {
    let parsed: unknown;
    try {
        parsed = option.parse ? option.parse(value) : value;
    } catch {
        usageError(`Invalid value for option "--${option.flag || option.name}"`);
    }

    if (option.choices && typeof parsed === "string" && !option.choices.includes(parsed)) {
        usageError(`Invalid choice for option "--${option.flag || option.name}"; allowed values: ${option.choices.join(", ")}`);
    }

    if (option.type === "number") {
        const number = Number(parsed);
        if (!Number.isFinite(number)) usageError(`Invalid number for option "--${option.flag || option.name}"`);
        return number;
    }
    if (option.type === "json" && typeof parsed === "string") {
        try {
            return JSON.parse(parsed);
        } catch {
            usageError(`Invalid JSON for option "--${option.flag || option.name}"`);
        }
    }
    if (option.type === "string[]") return typeof parsed === "string" ? [parsed] : parsed;
    if (option.type === "number[]") {
        const numbers = typeof parsed === "string" ? [Number(parsed)] : Array.isArray(parsed) ? parsed : [parsed];

        for (const n of numbers) {
            if (!Number.isFinite(n)) usageError(`Invalid number for option "--${option.flag || option.name}"`);
        }

        return numbers;
    }

    return parsed;
}

function parseOptionDescriptor(usage: string, description?: string, type?: OptionDescriptor["type"]): OptionDescriptor {
    const parts = usage.split(",").map((part) => part.trim());
    const longPart = parts.find((part) => part.startsWith("--")) || parts[0];
    const shortPart = parts.find((part) => /^-[^-]/.test(part));
    const longNameMatch = /--(?:no-)?([^\s<[]+)/.exec(longPart);
    const flag = longNameMatch ? longNameMatch[1] : usage.replace(/^[<-]+|[>\]]+$/g, "");
    const name = toCamelCase(flag);
    const explicitValue = /[<[][^>\]]+[>\]]/.test(usage);
    const negatable = /--no-/.test(usage);

    return {
        name,
        flag,
        description,
        short: shortPart ? shortPart.replace(/^-/, "").split(/\s+/)[0] : undefined,
        aliases: parts.filter((part) => part.startsWith("--") && part !== longPart).map((part) => toCamelCase(part.replace(/^--(?:no-)?/, "").split(/\s+/)[0])),
        type: type || (explicitValue ? "string" : "boolean"),
        negatable: negatable || undefined
    };
}

function parseArgumentDescriptor(usage: string, description?: string, required?: boolean): ArgumentDescriptor {
    const requiredBySyntax = usage.startsWith("<");
    const name = usage.replace(/^[<[]|[>\]]$/g, "");

    return {
        name,
        description,
        required: required ?? requiredBySyntax
    };
}

function toCamelCase(value: string): string {
    return value.replace(/-([a-zA-Z0-9])/g, (_, char: string) => char.toUpperCase());
}
