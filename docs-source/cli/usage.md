---
id: cli-usage
slug: /cli/usage
title: CLI usage
---

# CLI usage

The Transform Hub CLI (`si`) is the primary command-line interface for interacting with Transform Hub. It connects to a Manager or Hub API and provides commands for deploying, monitoring, and managing Sequences, Instances, Topics, and Hubs.

## Installation

Install the CLI globally:

```bash
npm install -g @scramjet/cli
```

Verify the installation:

```bash
si --version
```

## Command structure

The CLI follows a structured command pattern:

```
si <resource> <action> [options]
```

Resources include: `sequence`, `instance`, `hub`, `topic`, `config`.

## Common patterns

### Targeting a Manager or Hub

By default the CLI connects to `http://localhost:8000`. Override the target URL with `si config set apiUrl <url>`:

```bash
si config set apiUrl http://manager-prod:8200
```

### Working with Sequences

Package, deploy, inspect, and manage Sequence packages:

```bash
si sequence pack ./sequence-dir -o output.tar.gz    # Package a Sequence
si sequence deploy ./my-sequence.tar.gz               # Deploy and start a Sequence
si sequence list                                      # List all Sequences
si sequence info <id>                                 # Inspect a Sequence
si sequence delete <id>                               # Remove a Sequence
```

### Working with Instances

Deploy, inspect, and control running Sequence Instances:

```bash
si instance list                                      # List all Instances
si instance info <id>                                 # Inspect an Instance
si instance log <id>                                  # Stream Instance logs
si instance input <id>                                # Send data to an Instance
si instance stdout <id>                               # Read Instance stdout
si instance stop <id> <timeout>                       # Stop an Instance gracefully
si instance kill <id>                                 # Force-kill an Instance
```

### Managing Hubs

List, inspect, and manage connected Hubs:

```bash
si hub list                                           # List all connected Hubs
si hub info                                           # Inspect the current Hub
si hub delete <id>                                    # Remove a Hub from the Manager
```

### Topic commands

Create and manage Topics for inter-Sequence communication:

```bash
si topic create my-topic                              # Create a Topic
si topic list                                         # List Topics
si topic send my-topic < data.json                    # Send data to a Topic
si topic get my-topic                                 # Read data from a Topic
si topic delete my-topic                              # Delete a Topic
```

### Configuration commands

```bash
si config print                                       # Show current CLI configuration
si config set apiUrl http://...                       # Set default API URL
```

> **Note on API version**: The CLI currently supports two transport paths. The default is HTTP(S)/v1 (`/api/v1` route tree). Configure an [mTLS-authenticated Verser2 profile](verser2-cli.md) to use native v2 REST APIs through a Verser2 broker at the MultiManager, Manager, or Hub level. The Verser2 path never falls back to HTTP(S)/v1; commands without a v2 counterpart exit with a deterministic error. Backwards compatibility is maintained for the HTTP(S)/v1 path.

## Verser2 CLI setup (mTLS)

The `si` CLI can connect to a Verser2 broker using mTLS for native v2 API access. Configure a profile with:

```bash
si config set verser2.endpoint https://broker.example.com:2444
si config set verser2.brokerId my-broker
si config set verser2.ingress.level platform
si config set verser2.ingress.expectedId mm-1
si config set verser2.ingress.routeDomain mm-1-default
si config set verser2.tls.caFile /etc/scramjet/ca.pem
si config set verser2.tls.certFile /etc/scramjet/client.pem
si config set verser2.tls.keyFile /etc/scramjet/client-key.pem
```

Private key and PFX files must be owner-only (`chmod 600`) on POSIX systems. Secrets are redacted from `si config print`.

See the full [Verser2 CLI setup guide](verser2-cli.md) for:
- Certificate/key and PKCS#12 credential options and passphrase references
- Ingress levels: `platform` (MultiManager), `space` (Manager), or `hub` (direct Hub)
- Route domain discovery and identity verification
- Raw API syntax (`si api get <endpoint>`)
- Exit code reference and troubleshooting
- Command availability and intentionally unavailable operations

## Connecting conceptually to command help

The commands above cover common workflows. For the current listing of commands, flags, and options:

- Run `si --help` for inline usage information.
- Run `si <resource> --help` before scripting a specific command.
- Use the [generated CLI reference](../../docs/reference/cli/index.md) for the exported command, argument, and option listing.
- Use this prose guide when you need conceptual understanding of which commands to use for each workflow.

## See also

- [Transform Hub overview](../transform-hub/overview.md) for architecture context.
- [Build and run workflows](../transform-hub/build-run.md) for deployment lifecycle details.
- [API client documentation](../api/client-usage.md) for programmatic access.
- [Manager overview](../manager/overview.md) for understanding what the Manager provides.
- [Verser2 CLI setup guide](verser2-cli.md) for mTLS profile configuration and troubleshooting.
