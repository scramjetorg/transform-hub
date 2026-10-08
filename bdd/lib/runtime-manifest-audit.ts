import * as http from "http";
import { StringDecoder } from "string_decoder";

export type ManifestAuditRecord = Record<string, unknown> & { opCode: number };

export interface ManifestAuditCapture {
	readonly records: ManifestAuditRecord[];
	waitFor(predicate: (record: ManifestAuditRecord) => boolean): Promise<ManifestAuditRecord>;
	close(): Promise<void>;
}

export function openManifestAuditCapture(apiBase: string): Promise<ManifestAuditCapture> {
	return new Promise((resolve, reject) => {
		const endpoint = new URL("/api/v2/audit", apiBase);
		const request = http.get(endpoint, { agent: false }, response => {
			if (response.statusCode !== 200) {
				const error = new Error(`Audit stream returned HTTP ${response.statusCode}`);
				response.destroy(error);
				request.destroy(error);
				reject(error);
				return;
			}

			const records: ManifestAuditRecord[] = [];
			const waiters = new Set<{
				predicate: (record: ManifestAuditRecord) => boolean;
				resolve: (record: ManifestAuditRecord) => void;
				reject: (error: Error) => void;
			}>();
			let buffer = "";
			const decoder = new StringDecoder("utf8");
			let terminalError: Error | undefined;
			let closePromise: Promise<void> | undefined;

			const settle = (error?: Error) => {
				if (error && !terminalError) terminalError = error;
				for (const waiter of waiters) {
					waiters.delete(waiter);
					if (terminalError) waiter.reject(terminalError);
					else waiter.reject(new Error("Audit stream closed before a matching record arrived"));
				}
			};
			const parseLine = (line: string) => {
				if (!line) return;
				let record: unknown;
				try { record = JSON.parse(line); } catch (error) {
					const parseError = error instanceof Error ? error : new Error(String(error));
					terminalError = parseError;
					response.destroy(parseError);
					request.destroy(parseError);
					settle(parseError);
					return;
				}
				if (!record || typeof record !== "object" || (record as { opCode?: unknown }).opCode !== 13030) return;
				const publicRecord = record as ManifestAuditRecord;
				records.push(publicRecord);
				for (const waiter of waiters) {
					let matches = false;
					try { matches = waiter.predicate(publicRecord); } catch (error) {
						waiters.delete(waiter);
						waiter.reject(error instanceof Error ? error : new Error(String(error)));
						continue;
					}
					if (matches) {
						waiters.delete(waiter);
						waiter.resolve(publicRecord);
					}
				}
			};
			const finish = () => {
				buffer += decoder.end();
				if (buffer) parseLine(buffer.endsWith("\r") ? buffer.slice(0, -1) : buffer);
				buffer = "";
				settle();
			};

			response.on("data", (chunk: Buffer | string) => {
				buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);
				let newline;
				while ((newline = buffer.indexOf("\n")) !== -1) {
					const line = buffer.slice(0, newline).replace(/\r$/, "");
					buffer = buffer.slice(newline + 1);
					parseLine(line);
					if (terminalError) return;
				}
			});
			response.once("end", finish);
			response.once("error", error => settle(error));
			request.once("error", error => settle(error));

			const capture: ManifestAuditCapture = {
				records,
				waitFor(predicate) {
					const existing = records.find(predicate);
					if (existing) return Promise.resolve(existing);
					if (terminalError) return Promise.reject(terminalError);
					if (response.complete || response.destroyed) return Promise.reject(new Error("Audit stream is closed"));
					return new Promise((waitResolve, waitReject) => waiters.add({ predicate, resolve: waitResolve, reject: waitReject }));
				},
				close() {
					if (!closePromise) {
						settle();
						closePromise = new Promise<void>(done => {
							if (response.destroyed) return done();
							response.once("close", done);
						response.destroy();
						request.destroy();
					});
					}
					return closePromise;
				},
			};
			resolve(capture);
		});
		request.once("error", error => reject(error));
	});
}
