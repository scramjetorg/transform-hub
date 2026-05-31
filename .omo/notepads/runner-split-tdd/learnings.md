# Learnings — runner-split-tdd

## 2026-05-31 Session start
- packages/runner uses ava 3.x + ts-node/register
- Existing minimal recording server in packages/runner/test/transport/host-client-channels.spec.ts:14-50 (36+1 framing)
- CommunicationChannel imported from @scramjet/symbols
- Monitoring frame format: JSON.stringify([code, data]) + "\r\n" (CRLF-delimited)
- runner-node/src/message-utils.ts:12 confirms format
- host-client.ts:185-220 disconnect() skips CC.IN/STDIN/CONTROL in both branches (graceful path needs CC.IN close)
- csi-controller.ts:617 handleHandshake() reads: ports, sequenceInfo, payload.system.processPID, payload.appConfig, payload.args, payload.instanceName
- packages/runner/package.json uses ts-node/register for ava
