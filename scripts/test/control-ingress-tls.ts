import { execFileSync } from "child_process";
import { X509Certificate } from "crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export type ControlIngressTls = {
    dir: string;
    caFile: string;
    serverCertFile: string;
    serverKeyFile: string;
    allowedCert: string;
    allowedKey: string;
    rejectedCert: string;
    rejectedKey: string;
    allowedFingerprint: string;
    cleanup: () => void;
};

export function createControlIngressTls(): ControlIngressTls {
    const dir = mkdtempSync(join(tmpdir(), "control-ingress-tls-"));
    const caFile = join(dir, "ca.pem");
    const caKeyFile = join(dir, "ca-key.pem");
    const serverCertFile = join(dir, "server-cert.pem");
    const serverKeyFile = join(dir, "server-key.pem");
    const serverCsrFile = join(dir, "server.csr");
    const serverExtFile = join(dir, "server.ext");
    const createClient = (name: string) => {
        const key = join(dir, `${name}-key.pem`);
        const csr = join(dir, `${name}.csr`);
        const cert = join(dir, `${name}-cert.pem`);
        const ext = join(dir, `${name}.ext`);
        execFileSync("openssl", ["genrsa", "-out", key, "2048"], { stdio: "ignore" });
        execFileSync("openssl", ["req", "-new", "-key", key, "-out", csr, "-subj", `/CN=${name}`], { stdio: "ignore" });
        writeFileSync(ext, "basicConstraints=CA:FALSE\nextendedKeyUsage=clientAuth\nkeyUsage=digitalSignature,keyEncipherment\n");
        execFileSync("openssl", ["x509", "-req", "-in", csr, "-CA", caFile, "-CAkey", caKeyFile, "-CAcreateserial", "-out", cert, "-days", "1", "-sha256", "-extfile", ext], { stdio: "ignore" });
        return { cert: readFileSync(cert, "utf8"), key: readFileSync(key, "utf8") };
    };

    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", caKeyFile, "-out", caFile, "-days", "1", "-subj", "/CN=control-ingress-ca"], { stdio: "ignore" });
    execFileSync("openssl", ["genrsa", "-out", serverKeyFile, "2048"], { stdio: "ignore" });
    execFileSync("openssl", ["req", "-new", "-key", serverKeyFile, "-out", serverCsrFile, "-subj", "/CN=localhost"], { stdio: "ignore" });
    writeFileSync(serverExtFile, "subjectAltName=DNS:localhost\n");
    execFileSync("openssl", ["x509", "-req", "-in", serverCsrFile, "-CA", caFile, "-CAkey", caKeyFile, "-CAcreateserial", "-out", serverCertFile, "-days", "1", "-sha256", "-extfile", serverExtFile], { stdio: "ignore" });
    const allowed = createClient("allowed-client");
    const rejected = createClient("rejected-client");

    return {
        dir, caFile, serverCertFile, serverKeyFile,
        allowedCert: allowed.cert, allowedKey: allowed.key,
        rejectedCert: rejected.cert, rejectedKey: rejected.key,
        allowedFingerprint: new X509Certificate(allowed.cert).fingerprint256,
        cleanup: () => rmSync(dir, { recursive: true, force: true })
    };
}
