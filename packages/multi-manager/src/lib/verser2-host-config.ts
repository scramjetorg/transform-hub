import { ManagerVerser2Config } from "@scramjet/types";
import { VerserHostOptions, VerserHostTlsOptions } from "@signicode/verser2-host";

function createVerser2HostTlsOptions(config: ManagerVerser2Config): VerserHostTlsOptions {
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

    if (tls.mtlsRequired && !tls.clientAuthCaFile) {
        throw new Error("verser2 Host mTLS requires clientAuthCaFile");
    }

    if (!tls.clientAuthCaFile && !tls.mtlsRequired && config.registration.allowedClientFingerprints.length === 0) {
        return identity;
    }

    return {
        ...identity,
        clientAuth: {
            caFile: tls.clientAuthCaFile,
            authorizeRegistration: context => {
                if (context.metadata.local === true) {
                    return config.registration.allowLocalPeers ? { action: "allow" } : { action: "close", reason: "local peers disabled" };
                }

                if (tls.mtlsRequired && !context.certificate) {
                    return { action: "close", reason: "client certificate required" };
                }

                if (config.registration.allowedClientFingerprints.length > 0) {
                    const fingerprint = context.certificate?.fingerprint256;

                    if (!fingerprint || !config.registration.allowedClientFingerprints.includes(fingerprint)) {
                        return { action: "close", reason: "client fingerprint not allowed" };
                    }
                }

                return { action: "allow" };
            }
        }
    };
}

export function createVerser2HostOptions(config: ManagerVerser2Config): VerserHostOptions {
    return {
        host: config.host.bindHost,
        port: config.host.bindPort,
        tls: createVerser2HostTlsOptions(config)
    };
}
