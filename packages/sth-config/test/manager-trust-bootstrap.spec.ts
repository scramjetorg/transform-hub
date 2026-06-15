import test from "ava";
import { STHConfiguration } from "@scramjet/types";
import { applyManagerTrustBootstrap } from "../src/manager-trust-bootstrap";
import { defaultConfig } from "../src/default-config";

const ca = `-----BEGIN CERTIFICATE-----
MIIDaTCCAlGgAwIBAgIUIdfxPalBmaM4ytO90D5y/M4fOIowDQYJKoZIhvcNAQEL
BQAwRDEWMBQGA1UEAwwNd3d3Lm15ZG9tLmNvbTEdMBsGA1UECgwUTXkgQ29tcGFu
eSBOYW1lIExURC4xCzAJBgNVBAYTAlVTMB4XDTI2MDYxNTEzMTYwOVoXDTI4MDkx
NzEzMTYwOVowRDEWMBQGA1UEAwwNd3d3Lm15ZG9tLmNvbTEdMBsGA1UECgwUTXkg
Q29tcGFueSBOYW1lIExURC4xCzAJBgNVBAYTAlVTMIIBIjANBgkqhkiG9w0BAQEF
AAOCAQ8AMIIBCgKCAQEAr62SEe+MOd2NICTQyPyZtnluGx0Ne0SlTI5xuq0bOEEJ
qKju9k0zxpHMfOyEb0/GJbwUYNdsh5uTuONxFh+7K/v/ufiOu928QDBOArEzuYnj
KDmxzMK4w4bIsSPutzWIKxbUhINnuPnnGZXHTIZS/1SCEBj5Kc4HlHMcmR/HZYsb
SDMlTrC4QseFy0QGrvDoA8MDKtb3Ol13RYg6TGg3ykinc7BGDKJ73j1rG4h1M1Ng
j6BH8RvMb2v6MimvvhZv24Xnd1g0rJOHUeu742dEB+1c6NoVImPRicg3tX6v6nQ9
59wC/YRbHWv48l0QIw5hz4PlRF/OAOdJiGlul4d6zwIDAQABo1MwUTAdBgNVHQ4E
FgQU3fNdNLDJpCPvHpVOPJ95TRePPQswHwYDVR0jBBgwFoAU3fNdNLDJpCPvHpVO
PJ95TRePPQswDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAQ9N0
bwh1XYHlPomxpkv4Qz6yBYYno+YrWaTKysbkkm8rj0VaOqbeWXo76TnvejxZVrHr
nRVQyoIBqSZ6/3TSsdFNWdlaUNCTAyqoZpoe7BMFK8oY8BoDklzzvw+M9KgPFuOo
l8ec8jysgcrBMpzHWtkOAd/1W2F8O4mr0kjwRR5HuTRHRH5QNyG35G8yQ/R9q30q
sY8apzXSAVgndMcqqtIKY9yu7cW0cJ47vCQ02bzCM+iWQYB44WQupuqfSLSzB6L/
lCnIOklB9yZgPK4U4JTA29NIx4F85Kkm4nNNySGQKaq3q7ThTM7G59xmaxTteUko
xAGKFdRbvGL7durGbQ==
-----END CERTIFICATE-----`;
const fingerprint = "28:90:89:F4:30:4F:6E:66:75:4A:5C:87:2F:3F:D0:B4:E4:AD:85:3C:89:AD:7E:C1:01:C1:C7:5C:A4:A8:1A:07";

function config(): STHConfiguration {
    return {
        ...defaultConfig,
        verser2: {
            ...defaultConfig.verser2,
            enabled: true,
            hostUrl: "https://old-manager.example:2443",
            broker: { peerId: "sth.broker", targetDomain: "manager.old.scramjet.internal" },
            guest: { peerId: "sth.guest", routeDomain: "sth.test.scramjet.internal" },
            tls: { certFile: "/secret/sth-cert.pem", keyFile: "/secret/sth-key.pem" },
            enrollment: { token: "enrollment-token" }
        }
    };
}

test("applyManagerTrustBootstrap applies fetched Manager CA and route metadata", t => {
    const updated = applyManagerTrustBootstrap(config(), {
        ca,
        fingerprint256: fingerprint,
        hostUrl: "https://manager.example.test:2443",
        routeDomains: { guest: "manager.guest.scramjet.internal" }
    });

    t.is(updated.verser2.tls.ca, ca);
    t.is(updated.verser2.hostUrl, "https://manager.example.test:2443");
    t.is(updated.verser2.broker.targetDomain, "manager.guest.scramjet.internal");
    t.is(updated.verser2.tls.certFile, "/secret/sth-cert.pem");
    t.is(updated.verser2.tls.keyFile, "/secret/sth-key.pem");
    t.is(updated.verser2.enrollment.token, "enrollment-token");
});

test("applyManagerTrustBootstrap accepts matching pinned fingerprint", t => {
    const updated = applyManagerTrustBootstrap(config(), { ca, fingerprint256: fingerprint }, {
        pinnedFingerprint256: fingerprint.replace(/:/g, "").toLowerCase()
    });

    t.is(updated.verser2.tls.ca, ca);
});

test("applyManagerTrustBootstrap fails closed on pinned fingerprint mismatch", t => {
    t.throws(() => applyManagerTrustBootstrap(config(), { ca, fingerprint256: fingerprint }, {
        pinnedFingerprint256: "DD:EE:FF"
    }), { message: "Manager verser2 trust fingerprint mismatch" });
});

test("applyManagerTrustBootstrap fails closed when reported fingerprint does not match CA", t => {
    t.throws(() => applyManagerTrustBootstrap(config(), { ca, fingerprint256: "DD:EE:FF" }), {
        message: "Manager verser2 trust fingerprint metadata mismatch"
    });
});
