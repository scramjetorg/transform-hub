import { ManagerVerser2Config } from "@scramjet/api-types";
import { VerserHostOptions, VerserHostTlsOptions } from "@signicode/verser2-host";
import type { VerserRegistrationAuthorizationContext } from "@signicode/verser-common";

export type Verser2RegistrationAuthorizer = (context: VerserRegistrationAuthorizationContext) => { action: "allow" } | { action: "close"; reason: string };
export type Verser2FederationAuthorizer = (context: any) => { action: "allow"; authorizationContext?: unknown } | { action: "close"; reason: string };
export type Verser2RouteAuthorizer = (context: { previousAdvertisedDomain: string; nextSelectedDomain: string }) => { decision: "allow" | "deny"; cacheTtlMs: 0 };

function createVerser2HostTlsOptions(config: ManagerVerser2Config, v2Authorizer?: Verser2RegistrationAuthorizer, federationAuthorizer?: Verser2FederationAuthorizer): VerserHostTlsOptions {
    const tls = config.host.tls;
    let identity: VerserHostTlsOptions;

    if (tls.certFile && tls.keyFile) {
        identity = {
            certFile: tls.certFile,
            keyFile: tls.keyFile,
            passphrase: tls.passphrase
        };
    } else if (tls.pfxFile) {
        identity = {
            pfxFile: tls.pfxFile,
            passphrase: tls.passphrase
        };
    } else {
        throw new Error("verser2 Host TLS requires certFile/keyFile or pfxFile");
    }

    // Generated control-ingress identities use their generated CA as the
    // client-auth trust anchor. Explicit deployments may still provide a
    // narrower clientAuthCaFile.
    const clientAuthCaFile = tls.clientAuthCaFile || (tls.mtlsRequired ? tls.caFile : undefined);

    if (tls.mtlsRequired && !clientAuthCaFile) {
        throw new Error("verser2 Host mTLS requires clientAuthCaFile");
    }

    if (!tls.clientAuthCaFile && !tls.mtlsRequired && config.registration.allowedClientFingerprints.length === 0 && !v2Authorizer && !federationAuthorizer) {
        return identity;
    }

    return {
        ...identity,
        clientAuth: {
            caFile: clientAuthCaFile,
            ...(federationAuthorizer ? { authorizeFederation: federationAuthorizer } : {}),
            authorizeRegistration: context => {
                if (v2Authorizer) return v2Authorizer(context);
                if (context.metadata.local === true) {
                    return { action: "allow" };
                }

                if (tls.mtlsRequired && !context.certificate) {
                    return { action: "close", reason: "client certificate required" };
                }

                if (config.registration.allowedClientFingerprints.length > 0) {
                    const fingerprint = context.certificate?.fingerprint256;

                    if (!fingerprint || !config.registration.allowedClientFingerprints.some(allowed => allowed.replace(/^sha256:/i, "").replace(/:/g, "").toLowerCase() === fingerprint.replace(/^sha256:/i, "").replace(/:/g, "").toLowerCase())) {
                        return { action: "close", reason: "client fingerprint not allowed" };
                    }
                }

                return { action: "allow" };
            }
        }
    };
}

export function createVerser2HostOptions(config: ManagerVerser2Config, v2Authorizer?: Verser2RegistrationAuthorizer, federationAuthorizer?: Verser2FederationAuthorizer, routeAuthorizer?: Verser2RouteAuthorizer): VerserHostOptions {
    return {
        hostId: `${config.localBroker.peerId}.host`,
        host: config.host.bindHost,
        port: config.host.bindPort,
        tls: createVerser2HostTlsOptions(config, v2Authorizer, federationAuthorizer),
        ...(routeAuthorizer ? { routeAuthorizer } : {})
    };
}
