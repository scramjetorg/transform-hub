# MultiManager (aka `MM`, `mCPM`)

Scramjet MultiManager is a service responsible for supervising Mangers and exposing their APIs. It can start new managers (all within a single process) and stop them, and route requests to specific Manger instances it had started.

## Setting up and starting MultiManager

As MultiManager is one of the many packages in the project, follow the instruction on building entire project. After that, you can start MultiManger built version via:

```bash
node dist/multi-manager/bin/start.js
```

or from source (*this does not requires building*):

```bash
ts-node sth/packages/multi-manager/src/bin/start.ts
```

In both cases, you should see logs like:

```plain
Starting MultiManager with config: { ... }
2022-04-11T13:22:25.517Z INFO  MultiManager Starting mCPM [ '0.20.0' ]
```

By default it will start on `http://0.0.0.0:11000`. You can check if it is functional by querying its `/version` endpoint:

```bash
curl http://0.0.0.0:11000/api/v1/version
```

## Configuration

At the moment, MultiManager settings can be changed via command line options when starting its instance.

> **ProTip**: If you would like to see all defined options directly in the code, refer to `sth/packages/multi-manager/src/bin/start.ts` file.

### Default config

There is also a file with default config defined, available in `sth/packages/multi-manager/src/lib/default-config.ts`.

### Available settings

Below is table with all configuration options available.

<!-- For editing the table below, I recommend https://tableconvert.com -->

| Config name | CMD Parameter     | Required | Description                                                                  | Default value |
|-------------|-------------------|----------|------------------------------------------------------------------------------|---------------|
| id          | --id              | no       | MultiManager id.                                                             | -             |
| apiBase     | --server-api-base | no       | MultiManager API server base path.                                           | /api/v1       |
| apiPort     | --server-api-port | no       | MultiManager API server port.                                                | 11000         |
| version     | --server-version  | no       | MultiManager API server version.                                             | -             |
| logLevel    | --log-level       | no       | Log levels displayed during runtime.                                         | TRACE         |
| sslKeyPath  | --ssl-key-path    | no       | Path to SSL Key to encrypt Manager <-> Host communication.                   | -             |
| sslCertPath | --ssl-cert-path   | no       | Path to SSL Certificate to encrypt Manager <-> Host communication.           | -             |
| manager     | --manager         | no       | Instruct MultiManager to start Manager with a given id after initialization. | -             |

## Spawning and supervising Managers

One of the main purposes of MultiManager is the ability to start and stop Managers. It can be done through dedicated `/start` endpoint:

```bash
curl -X POST 'localhost:11000/api/v1/start' \
  -H 'Accept: */*' \
  -H 'Content-Type: application/json' \
  -d '{
    "manager": {
        "id": "Mgr-1"
    }
}'
```
It accepts several parameters which controls how Manager is spawned. 
For all the options refer to [Manager README](../manager/README.md).  
To stop Manager instance\, dedicated `/stop` endpoint needs to be queried:

```bash
curl -X POST http://0.0.0.0:11000/api/v1/cpm/:managerId/stop
```

## Starting Manager on MultiManager start

You can also tell MultiManager to initialize single Manager instance right after it is started. This is the purpose of `--manager` config option which can be used like:

```bash
node dist/multi-manager/bin/start.js --manager Mgr-1
```

## Querying Manager instances

To query specific Manager instance via MultiManager, there is a dedicated API endpoint exposed:

```
http://0.0.0.0:11000/api/v1/cpm/:managerId/api/v1/:managerEndpoint
```

This means if you want to query `/version` endpoint of manager with id `Mgr-1` started via MultiManager available on `http://0.0.0.0:11000` it will be:

> curl 0.0.0.0:11000/api/v1/cpm/**Mgr-1**/api/v1/**version**

## STH Connectivity

MultiManager and its managed Manager instances use verser2 Host/Broker/Guest routing for STH connectivity. The previous forwarding path is retired.
