import { normalizeUrl, ConfigFileDefault } from "@scramjet/utility";
import { closeSync, existsSync, fchmodSync, fchownSync, fsyncSync, openSync, renameSync, statSync, unlinkSync, writeFileSync } from "fs";
import { extname } from "path";
import { randomBytes } from "crypto";
import { configEnv, ProfileConfigEntity } from "../../types";
import { profileConfigDefault, validateProfileEntry, validateProfileKeysSize } from "./commonProfileConfig";
import { Verser2ProfileConfig } from "../../types";
import { validateVerser2Profile } from "./verser2Profile";


// Profile configuration class. Represents configuration that can be maniupulated by user.
export default class ProfileConfig extends ConfigFileDefault<ProfileConfigEntity> {
    protected readonly defaultConfiguration: ProfileConfigEntity = profileConfigDefault;

    constructor(configFile: string) {
        super(configFile, profileConfigDefault);
    }

    get apiUrl() { return this.get().apiUrl; }
    get middlewareApiUrl() { return this.get().middlewareApiUrl; }
    get env() { return this.get().env; }
    get scope() { return this.get().scope; }
    get token() { return this.get().token; }
    protected get log() { return this.get().log; }
    get debug() { return this.get().log.debug; }
    get apiClients() { return this.get().log.apiClients !== false; }
    get format() { return this.get().log.format; }
    get path() { return this.file.path; }
    get(): ProfileConfigEntity {
        const stored = super.get() as ProfileConfigEntity;
        const { verser2Draft: _draft, ...active } = stored;
        return active;
    }
    getEntry(key: keyof ProfileConfigEntity): any | null {
        return key === "verser2Draft" ? null : super.getEntry(key);
    }

    set(config: any): boolean {
        const { log: currentLog, ...currentConfig } = super.get();
        const { log: newLog, ...newConfig } = config;
        const overlap = { ...currentConfig, ...newConfig, log: { ...currentLog, ...newLog } };

        return super.set(overlap);
    }

    setApiUrl(apiUrl: string): boolean {
        return this.setEntry("apiUrl", normalizeUrl(apiUrl));
    }
    setMiddlewareApiUrl(middlewareApiUrl: string): boolean {
        return this.setEntry("middlewareApiUrl", normalizeUrl(middlewareApiUrl));
    }
    setEnv(env: configEnv): boolean {
        return this.setEntry("env", env);
    }
    setScope(scope: string): boolean {
        return this.setEntry("scope", scope);
    }
    setToken(token: string): boolean {
        return this.setEntry("token", token);
    }
    setDebug(debug: boolean): boolean {
        return this.setEntry("log", { ...this.log, debug });
    }
    setFormat(format: string): boolean {
        return this.setEntry("log", { ...this.log, format });
    }
    setVerser2(verser2: Verser2ProfileConfig): boolean {
        return this.setEntry("verser2" as keyof ProfileConfigEntity, verser2);
    }
    updateVerser2(update: (current: Verser2ProfileConfig) => Verser2ProfileConfig): boolean {
        const current = this.get().verser2;
        if (!current) return false;
        return this.setVerser2(update({ ...current, ingress: { ...current.ingress }, target: current.target && { ...current.target }, tls: { ...current.tls } }));
    }
    updateVerser2Draft(update: (current: Record<string, any>) => Record<string, any>): boolean {
        const current = (this.configuration as any).verser2Draft || (this.configuration as any).verser2 || {};
        const draft = update(JSON.parse(JSON.stringify(current)));
        if (!validateProfileEntry("verser2Draft", draft)) return false;
        const candidate: any = JSON.parse(JSON.stringify(this.configuration));
        candidate.verser2Draft = draft;
        return this.persistCandidate(candidate);
    }
    setVerser2DraftTls(field: "certFile" | "keyFile" | "pfxFile", value: string): boolean {
        return this.updateVerser2Draft(current => {
            if (!current.tls) current.tls = {};
            const tls = current.tls;
            tls[field] = value;
            if (field === "pfxFile") {
                delete tls.certFile;
                delete tls.keyFile;
            } else {
                delete tls.pfxFile;
            }
            return current;
        });
    }
    promoteVerser2Draft(): boolean {
        return this.promoteVerser2DraftResult() === "promoted";
    }
    promoteVerser2DraftResult(): "promoted" | "incomplete" | "failed" {
        const draft = (this.configuration as any).verser2Draft;
        if (!validateVerser2Profile(draft)) return "incomplete";
        const candidate: any = JSON.parse(JSON.stringify(this.configuration));
        candidate.verser2 = draft;
        delete candidate.verser2Draft;
        return this.persistCandidate(candidate) ? "promoted" : "failed";
    }
    resetVerser2Field(path: string): boolean {
        const candidate: any = JSON.parse(JSON.stringify(this.configuration));
        const source = candidate.verser2Draft || candidate.verser2 || {};
        const draft = JSON.parse(JSON.stringify(source));
        const changed = (() => {
            const parts = path.split(".");
            let target: any = draft;
            for (const part of parts.slice(0, -1)) { target = target[part] ||= {}; }
            const key = parts[parts.length - 1];
            delete target[key];
            if (draft.target && !Object.keys(draft.target).length) delete draft.target;
            return validateProfileEntry("verser2Draft", draft);
        })();
        if (!changed) return false;
        candidate.verser2Draft = draft;
        return this.persistCandidate(candidate);
    }
    resetVerser2(): boolean {
        const current = this.get() as ProfileConfigEntity & { verser2?: Verser2ProfileConfig };
        delete current.verser2;
        return super.set(current);
    }

    validate(config: Object): boolean {
        if (!validateProfileKeysSize(config))
            return false;
        return super.validate(config);
    }

    protected validateEntry(key: string, value: any): boolean | null {
        return validateProfileEntry(key, value);
    }

    private persistCandidate(candidate: any): boolean {
        const targetPath = this.file.path;
        const extension = extname(targetPath);
        const temporaryPath = `${targetPath.slice(0, targetPath.length - extension.length)}.tmp-${randomBytes(16).toString("hex")}${extension}`;
        let descriptor: number | undefined;
        try {
            const existing = existsSync(targetPath) ? statSync(targetPath) : undefined;
            const mode = existing ? existing.mode & 0o777 : 0o600;
            descriptor = openSync(temporaryPath, "wx", mode);
            fchmodSync(descriptor, mode);
            if (existing && process.platform !== "win32") fchownSync(descriptor, existing.uid, existing.gid);
            writeFileSync(descriptor, JSON.stringify(candidate, null, 2), "utf8");
            fsyncSync(descriptor);
            closeSync(descriptor);
            descriptor = undefined;
            renameSync(temporaryPath, targetPath);
            this.configuration = candidate;
            this.isValidConfig = true;
            return true;
        } catch (_) {
            if (descriptor !== undefined) closeSync(descriptor);
            if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
            return false;
        }
    }
}
