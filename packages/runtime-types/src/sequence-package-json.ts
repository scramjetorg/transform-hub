/**
 * Sequence package.json types.
 *
 * Simplified structural copies from the old types package/sequence-package-json.ts.
 */

export type PortConfig = `${number}/${"tcp" | "udp"}`;

export type SequencePackageJSONScramjetConfig = {
    ports?: PortConfig[] | null;
};

export type SequencePackageJSONScramjetSection = {
    config?: SequencePackageJSONScramjetConfig | null;
};

export type SequencePackageJSON = {
    name?: string | null;
    version?: string | null;
    main: string;
    engines?: Record<string, string> | null;
    scramjet?: SequencePackageJSONScramjetSection | null;
    description?: string;
    author?: string;
    keywords?: string[];
    args?: any[];
    exposePath?: string;
    exposeHost?: string;
    tags?: string[];
    repository?: Record<string, any> | string;
};
