import { existsSync, readFileSync } from "fs";
import { extname } from "path";
import { cac } from "cac";
import { parse as parseJsonc } from "jsonc-parser";
import YAML from "yaml";
import { z, ZodError, ZodIssue, ZodType } from "zod";

export type ConfigPath = string | readonly string[];
export type CliOptionType = "string" | "number" | "boolean" | "string[]" | "number[]" | "json";

export interface ConfigOptionDescriptor {
    name: string;
    flag?: string;
    path?: ConfigPath;
    description?: string;
    type?: CliOptionType;
    short?: string;
    aliases?: readonly string[];
    flagAliases?: readonly string[];
    choices?: readonly string[];
    parse?: (value: string) => unknown;
    env?: string;
    envAliases?: readonly string[];
    defaultValue?: unknown;
    secret?: boolean;
    multiple?: boolean;
    negatable?: boolean;
}

export interface RuntimeOptionRegistry {
    option(descriptor: ConfigOptionDescriptor): this;
    getOptions(): ConfigOptionDescriptor[];
}

export interface ParseCliOptionsInput {
    name?: string;
    argv: readonly string[];
    options: readonly ConfigOptionDescriptor[];
}

export interface LoadConfigInput<T> {
    schema: ZodType<T>;
    defaults?: Record<string, unknown>;
    configFilePath?: string;
    packageJsonPath?: string;
    packageJsonSection?: string;
    dotenvPath?: string;
    dotenv?: Record<string, string | undefined>;
    env?: Record<string, string | undefined>;
    cli?: Record<string, unknown>;
    overrides?: Record<string, unknown>;
    options?: readonly ConfigOptionDescriptor[];
    aliases?: Record<string, ConfigPath>;
}

export interface LoadedConfig<T> {
    config: T;
    publicConfig: unknown;
}

class DefaultRuntimeOptionRegistry implements RuntimeOptionRegistry {
    private readonly options: ConfigOptionDescriptor[] = [];

    option(descriptor: ConfigOptionDescriptor): this {
        this.options.push(descriptor);
        return this;
    }

    getOptions(): ConfigOptionDescriptor[] {
        return [...this.options];
    }
}

export function createOptionRegistry(): RuntimeOptionRegistry {
    return new DefaultRuntimeOptionRegistry();
}

export function parseCliOptions(input: ParseCliOptionsInput): Record<string, unknown> {
    const cli = cac(input.name || "scramjet");

    input.options.forEach(option => {
        const flags = formatFlags(option);
        const config = optionConfig(option);

        cli.option(flags, option.description || "", config);
    });

    const parsed = cli.parse([...input.argv], { run: false });
    const values: Record<string, unknown> = {};

    input.options.forEach(option => {
        const keys = [option.name, option.flag, ...(option.aliases || []), ...(option.flagAliases || [])]
            .filter(Boolean) as string[];
        const key = keys.find(candidate => parsed.options[normalizeOptionKey(candidate)] !== undefined);

        if (!key) return;

        const raw = parsed.options[normalizeOptionKey(key)];

        values[option.name] = coerceCliValue(raw, option);
    });

    return values;
}

export function loadConfig<T>(input: LoadConfigInput<T>): LoadedConfig<T> {
    const descriptors = input.options || [];
    const merged = mergeAll([
        input.defaults || {},
        input.configFilePath ? readConfigFile(input.configFilePath) : {},
        readPackageJsonSection(input.packageJsonPath, input.packageJsonSection),
        envToConfig({ env: input.dotenv || readDotEnvFile(input.dotenvPath), options: descriptors, includeAliases: false }),
        envToConfig({ env: input.env || {}, options: descriptors, includeAliases: true }),
        cliToConfig(input.cli || {}, descriptors),
        input.overrides || {}
    ]);

    applyAliases(merged, input.aliases || {});

    const parsed = input.schema.parse(merged);

    return {
        config: parsed,
        publicConfig: maskConfig(parsed, descriptors)
    };
}

export function readConfigFile(path: string): Record<string, unknown> {
    if (!existsSync(path)) return {};

    const raw = readFileSync(path, "utf8");
    const extension = extname(path).toLowerCase();

    if (extension === ".json") return JSON.parse(raw);
    if (extension === ".jsonc") return parseJsonc(raw) as Record<string, unknown>;
    if (extension === ".yaml" || extension === ".yml") return YAML.parse(raw) || {};

    throw new Error(`Unsupported config file extension: ${extension || "<none>"}`);
}

export function mergeConfig<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
    Object.keys(source).forEach(key => {
        const value = source[key];

        if (value === undefined) return;

        if (isPlainObject(value) && isPlainObject(target[key])) {
            mergeConfig(target[key] as Record<string, unknown>, value as Record<string, unknown>);
        } else if (isPlainObject(value)) {
            target[key as keyof T] = mergeConfig({}, value as Record<string, unknown>) as T[keyof T];
        } else if (Array.isArray(value)) {
            target[key as keyof T] = [...value] as T[keyof T];
        } else {
            target[key as keyof T] = value as T[keyof T];
        }
    });

    return target;
}

export function maskConfig(value: unknown, options: readonly ConfigOptionDescriptor[], mask = "********"): unknown {
    const clone = cloneValue(value);

    options.filter(option => option.secret).forEach(option => {
        const path = toPath(option.path || option.name);

        if (getPath(clone, path) !== undefined) setPath(clone, path, mask);
    });

    return clone;
}

export function formatZodError(error: ZodError): string {
    return error.issues
        .map((issue: ZodIssue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("\n");
}

function formatFlags(option: ConfigOptionDescriptor): string {
    const longFlag = `--${option.flag || option.name}`;
    const typedLongFlag = option.type === "boolean" ? longFlag : `${longFlag} <value>`;
    const flags = option.short ? [`-${option.short}`, typedLongFlag] : [typedLongFlag];

    (option.flagAliases || []).forEach(alias => {
        flags.push(option.type === "boolean" ? `--${alias}` : `--${alias} <value>`);
    });

    if (option.negatable !== false && option.type === "boolean") {
        flags.push(`--no-${option.name}`);
    }

    return flags.join(", ");
}

function optionConfig(option: ConfigOptionDescriptor): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    if (option.type === "boolean") config.default = option.defaultValue;
    if (option.type === "number") config.type = Number;
    if (option.type === "number[]") config.type = [Number];
    if (option.type === "string" || option.type === "json") config.type = String;
    if (option.type === "string[]") config.type = [String];
    if (option.multiple || option.type === "string[]" || option.type === "number[]") config.default = [];

    return config;
}

function coerceCliValue(value: unknown, option: ConfigOptionDescriptor): unknown {
    const type = option.type || "string";
    const coerced = option.parse && typeof value === "string" ? option.parse(value) : coerceValue(value, type);

    if (option.choices && typeof coerced === "string" && !option.choices.includes(coerced)) {
        throw new Error(`Invalid value for --${option.flag || option.name}: ${coerced}`);
    }

    return coerced;
}

function coerceValue(value: unknown, type: CliOptionType): unknown {
    if (value === undefined) return undefined;
    if (type === "boolean") return Boolean(value);
    if (type === "number") return typeof value === "number" ? value : Number(value);
    if (type === "json") return typeof value === "string" ? JSON.parse(value) : value;
    if (type === "string[]") return Array.isArray(value) ? value.map(String) : [String(value)];
    if (type === "number[]") return (Array.isArray(value) ? value : [value]).map(Number);
    return String(value);
}

function mergeAll(sources: readonly Record<string, unknown>[]): Record<string, unknown> {
    return sources.reduce((target, source) => mergeConfig(target, source || {}), {} as Record<string, unknown>);
}

function readPackageJsonSection(packageJsonPath?: string, section?: string): Record<string, unknown> {
    if (!packageJsonPath || !section || !existsSync(packageJsonPath)) return {};

    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    const value = packageJson[section];

    return isPlainObject(value) ? value : {};
}

function readDotEnvFile(path?: string): Record<string, string> {
    if (!path || !existsSync(path)) return {};

    return readFileSync(path, "utf8").split(/\r?\n/).reduce((env, line) => {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) return env;

        const separator = trimmed.indexOf("=");

        if (separator === -1) return env;

        env[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
        return env;
    }, {} as Record<string, string>);
}

function envToConfig(input: {
    env: Record<string, string | undefined>;
    options: readonly ConfigOptionDescriptor[];
    includeAliases: boolean;
}): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    input.options.forEach(option => {
        const keys = [option.env, ...(input.includeAliases ? option.envAliases || [] : [])].filter(Boolean) as string[];
        const key = keys.find(candidate => input.env[candidate] !== undefined);

        if (!key) return;

        setPath(result, toPath(option.path || option.name), coerceEnv(input.env[key], option.type || "string"));
    });

    return result;
}

function cliToConfig(cli: Record<string, unknown>, options: readonly ConfigOptionDescriptor[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    options.forEach(option => {
        if (cli[option.name] === undefined) return;
        setPath(result, toPath(option.path || option.name), cli[option.name]);
    });

    return result;
}

function applyAliases(config: Record<string, unknown>, aliases: Record<string, ConfigPath>): void {
    Object.keys(aliases).forEach(alias => {
        const aliasPath = toPath(alias);
        const value = getPath(config, aliasPath);

        if (value === undefined) return;

        const targetPath = toPath(aliases[alias]);
        const existingValue = getPath(config, targetPath);

        if (isPlainObject(existingValue) && isPlainObject(value)) {
            mergeConfig(existingValue, value);
        } else {
            setPath(config, targetPath, value);
        }

        deletePath(config, aliasPath);
    });
}

function coerceEnv(value: string | undefined, type: CliOptionType): unknown {
    if (value === undefined) return undefined;
    if (type === "boolean") return ["1", "true", "yes", "on"].includes(value.toLowerCase());
    if (type === "number") return Number(value);
    if (type === "json") return JSON.parse(value);
    if (type === "string[]") return value.split(",").map(item => item.trim());
    if (type === "number[]") return value.split(",").map(item => Number(item.trim()));
    return value;
}

function toPath(path: ConfigPath): string[] {
    return typeof path === "string" ? path.split(".") : [...path];
}

function normalizeOptionKey(name: string): string {
    return name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

function setPath(target: unknown, path: readonly string[], value: unknown): void {
    let cursor = target as Record<string, unknown>;

    path.slice(0, -1).forEach(part => {
        if (!isPlainObject(cursor[part])) cursor[part] = {};
        cursor = cursor[part] as Record<string, unknown>;
    });

    cursor[path[path.length - 1]] = value;
}

function getPath(target: unknown, path: readonly string[]): unknown {
    return path.reduce((cursor, part) => isPlainObject(cursor) ? cursor[part] : undefined, target);
}

function deletePath(target: unknown, path: readonly string[]): void {
    const parent = path.slice(0, -1).reduce((cursor, part) => isPlainObject(cursor) ? cursor[part] : undefined, target);

    if (isPlainObject(parent)) delete parent[path[path.length - 1]];
}

function cloneValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(cloneValue);
    if (!isPlainObject(value)) return value;

    return Object.keys(value).reduce((copy, key) => {
        copy[key] = cloneValue(value[key]);
        return copy;
    }, {} as Record<string, unknown>);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Re-export Native CLI Command Model
export * from "./command-model";

export { z };
export * from "./verser2-config";
