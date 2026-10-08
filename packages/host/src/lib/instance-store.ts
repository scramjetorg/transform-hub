import { ICSI } from "./types";
import { matchesRpcExposePath } from "./rpc-path";
import { IDProvider } from "@scramjet/model";
import { InstanceManifestResponse, ManifestChange, ManifestDeclaration, ManifestReceipt, ManifestSequenceMetadata } from "@scramjet/runtime-types";
import { snapshotManifestDeclaration } from "@scramjet/rest-api2";
import { ManifestChangeHandler, ManifestRemovalReason } from "./types/instance-store";

type ManifestOwnerRegistration = {
    owner: ICSI;
    instanceId: string;
    sequenceId: string;
    sequence: ManifestSequenceMetadata;
    terminated: boolean;
};

type InstanceManifestPublication = {
    owner: ICSI;
    declaration: ManifestDeclaration;
    revision: string;
};

export class ManifestPublicationError extends Error {
    constructor(readonly code: string, message: string) {
        super(message);
        this.name = "ManifestPublicationError";
    }
}

export class InstancesStore extends Map<string, ICSI> {
    private exposePathMap: Map<string, Set<string>> = new Map();
    private reservedIds: Set<string> = new Set();
    /** stable name -> instanceId */
    private nameMap: Map<string, string> = new Map();

    /** reverse mapping for cleanup: instanceId -> stable name */
    private nameReverse: Map<string, string> = new Map();
    private manifestOwners = new Map<string, ManifestOwnerRegistration>();
    private instanceManifests = new Map<string, InstanceManifestPublication>();
    private manifestChangeHandler?: ManifestChangeHandler;

    get length() {
        return this.size;
    }

    setManifestChangeHandler(handler?: ManifestChangeHandler): void {
        this.manifestChangeHandler = handler;
    }

    publishManifest(owner: ICSI, declaration: ManifestDeclaration): ManifestReceipt {
        const registration = this.manifestOwners.get(owner.id);
        if (!registration || registration.owner !== owner || registration.terminated || this.get(registration.instanceId) !== owner) {
            throw new ManifestPublicationError("INSTANCE_NOT_ACTIVE", "The instance is not active for manifest publication");
        }

        const snapshot = snapshotManifestDeclaration(declaration);
        const previous = this.instanceManifests.get(registration.instanceId);
        const previousPublication = previous?.owner === owner ? previous : undefined;
        const revision = IDProvider.generate();
        const receipt: ManifestReceipt = {
            instanceId: registration.instanceId,
            sequenceId: registration.sequenceId,
            revision
        };

        this.instanceManifests.set(registration.instanceId, { owner, declaration: snapshot, revision });
        this.emitManifestChange({
            action: previousPublication ? "updated" : "published",
            instanceId: registration.instanceId,
            sequenceId: registration.sequenceId,
            revision,
            previousRevision: previousPublication?.revision || null,
            manifest: snapshotManifestDeclaration(snapshot),
            sequence: { ...registration.sequence }
        });

        return receipt;
    }

    getManifest(owner: ICSI): InstanceManifestResponse | undefined {
        const registration = this.manifestOwners.get(owner.id);
        if (!registration || registration.owner !== owner || this.get(registration.instanceId) !== owner) return undefined;

        const publication = this.instanceManifests.get(registration.instanceId);
        const current = publication?.owner === owner && !registration.terminated ? publication : undefined;
        return {
            instanceId: registration.instanceId,
            sequenceId: registration.sequenceId,
            revision: current?.revision ?? null,
            manifest: current ? snapshotManifestDeclaration(current.declaration) : null,
            sequence: { ...registration.sequence }
        };
    }

    getSequenceManifests(sequenceId: string): InstanceManifestResponse[] {
        const results: InstanceManifestResponse[] = [];
        for (const registration of this.manifestOwners.values()) {
            if (registration.sequenceId !== sequenceId || registration.terminated || this.get(registration.instanceId) !== registration.owner) continue;
            const publication = this.instanceManifests.get(registration.instanceId);
            if (publication?.owner !== registration.owner) continue;
            results.push({
                instanceId: registration.instanceId,
                sequenceId: registration.sequenceId,
                revision: publication.revision,
                manifest: snapshotManifestDeclaration(publication.declaration),
                sequence: { ...registration.sequence }
            });
        }
        return results;
    }

    removeManifest(owner: ICSI, reason: ManifestRemovalReason): boolean {
        const registration = this.manifestOwners.get(owner.id);
        if (!registration || registration.owner !== owner || registration.terminated) return false;
        registration.terminated = true;

        const publication = this.instanceManifests.get(registration.instanceId);
        if (!publication || publication.owner !== owner) return false;
        this.instanceManifests.delete(registration.instanceId);
        this.emitManifestChange({
            action: "removed",
            instanceId: registration.instanceId,
            sequenceId: registration.sequenceId,
            revision: null,
            previousRevision: publication.revision,
            manifest: null,
            sequence: { ...registration.sequence },
            reason
        });
        return true;
    }

    private captureManifestOwner(instanceId: string, owner: ICSI): ManifestOwnerRegistration {
        const config = owner.sequence?.config || {};
        const sequence: ManifestSequenceMetadata = {};
        const name = typeof config.name === "string" ? config.name : owner.sequence?.name;
        if (typeof name === "string") sequence.name = name;
        if (typeof config.version === "string") sequence.version = config.version;
        if (typeof config.description === "string") sequence.description = config.description;
        return { owner, instanceId, sequenceId: owner.sequence?.id || "", sequence, terminated: false };
    }

    private emitManifestChange(change: ManifestChange): void {
        this.manifestChangeHandler?.(change);
    }

    registerRpc(path: string, instanceId: string) {
        if (!this.exposePathMap.has(path)) {
            this.exposePathMap.set(path, new Set());
        }
        this.exposePathMap.get(path)?.add(instanceId);
    }

    unregisterRpc(path: string, instanceId: string) {
        const set = this.exposePathMap.get(path);
        if (!set) return;
        set.delete(instanceId);
        if (!set.size) this.exposePathMap.delete(path);
    }

    map<X>(mapper: (csiController: ICSI) => X): X[] {
        const values = this.values();

        return Array.from(values).map(mapper);
    }

    getByInstanceId(instanceId: string): ICSI | undefined {
        return this.get(instanceId);
    }

    reserveId(instanceId: string) {
        if (this.has(instanceId) || this.reservedIds.has(instanceId)) {
            return false;
        }

        this.reservedIds.add(instanceId);

        return true;
    }

    releaseId(instanceId: string) {
        this.reservedIds.delete(instanceId);
    }

    hasReservedId(instanceId: string): boolean {
        return this.reservedIds.has(instanceId);
    }

    private clearNameForInstance(instanceId: string) {
        const currentName = this.nameReverse.get(instanceId);

        if (!currentName) {
            return;
        }

        this.nameReverse.delete(instanceId);

        if (this.nameMap.get(currentName) === instanceId) {
            this.nameMap.delete(currentName);
        }
    }

    reserveName(instanceName: string, instanceId: string) {
        const existing = this.nameMap.get(instanceName);

        if (existing && existing !== instanceId) {
            return false;
        }

        const currentName = this.nameReverse.get(instanceId);

        if (currentName && currentName !== instanceName) {
            this.clearNameForInstance(instanceId);
        }

        this.nameMap.set(instanceName, instanceId);
        this.nameReverse.set(instanceId, instanceName);

        return true;
    }

    registerName(instanceName: string, instanceId: string) {
        if (!this.has(instanceId)) {
            return;
        }

        this.reserveName(instanceName, instanceId);
    }

    unregisterName(instanceName: string, instanceId: string) {
        const mapped = this.nameMap.get(instanceName);

        if (mapped && mapped === instanceId) {
            this.nameMap.delete(instanceName);
            this.nameReverse.delete(instanceId);
        }
    }

    getByName(instanceName: string): ICSI | undefined {
        const id = this.nameMap.get(instanceName);

        if (!id) return undefined;
        return this.get(id);
    }

    hasName(instanceName: string): boolean {
        return this.nameMap.has(instanceName);
    }

    getByNameOrId(token: string): ICSI | undefined {
        const byId = this.get(token);

        if (byId) return byId;

        return this.getByName(token);
    }

    getByExposePath(exposePath: string): ICSI[] {
        const set = Array.from(this.exposePathMap)
            .filter(([path]) => matchesRpcExposePath(exposePath, path))
            .sort(([left], [right]) => right.length - left.length)[0]?.[1];

        if (!set) {
            return [];
        }

        return Array.from(set)
            .map((instanceId) => this.get(instanceId))
            .filter((instance): instance is ICSI => !!instance);
    }

    set(instanceId: string, value: ICSI): this {
        const current = this.get(instanceId);
        if (current && current !== value) {
            this.removeManifest(current, "instance-replaced");
            this.manifestOwners.delete(instanceId);
        }
        const res = super.set(instanceId, value);

        if (current !== value || !this.manifestOwners.has(instanceId)) {
            this.manifestOwners.set(instanceId, this.captureManifestOwner(instanceId, value));
        }

        this.releaseId(instanceId);

        const name = this.nameReverse.get(instanceId);

        if (name) {
            this.nameMap.set(name, instanceId);
        }

        return res;
    }

    delete(instanceId: string): boolean {
        const current = this.get(instanceId);
        if (current) this.removeManifest(current, "instance-deleted");
        this.manifestOwners.delete(instanceId);
        this.instanceManifests.delete(instanceId);
        this.releaseId(instanceId);
        this.clearNameForInstance(instanceId);

        for (const [path, set] of this.exposePathMap.entries()) {
            if (set.has(instanceId)) {
                set.delete(instanceId);
                if (!set.size) this.exposePathMap.delete(path);
            }
        }

        return super.delete(instanceId);
    }

    clear(): void {
        for (const registration of this.manifestOwners.values()) {
            this.removeManifest(registration.owner, "host-stopped");
        }
        this.manifestOwners.clear();
        this.instanceManifests.clear();
        this.reservedIds.clear();
        this.nameMap.clear();
        this.nameReverse.clear();
        this.exposePathMap.clear();
        super.clear();
    }
}
