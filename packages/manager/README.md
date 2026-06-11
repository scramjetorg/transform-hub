# Manager (aka `M`, `CPM`)

Scramjet Manager is a class responsible for supervising Hosts and exposing their APIs. It can route requests to specific Host instances that were connected to the Manager and so list and manage their resources.

## Starting Manager

Manager is a class instance so it's not designed to be run as a standalone program. Instead, it needs to be started from MultiManager. It can be started via MultiManager by querying its `/start` API endpoint. Assuming that MultiManager is available under `http://0.0.0.0:11000`:

```bash
curl -X POST http://0.0.0.0:11000/api/v1/start --header 'content-type: application/json'
```

For more details on starting MultiManager and other methods how to start Manager instances please refer to [MultiManager documentation](../multi-manager/README.md).

## Configuration

At the moment, Manager settings can be changed when starting its instance through MultiManager service.

> **ProTip**: If you would like to see all defined options directly in the code, refer to `sth/packages/manager-config/src/default-config.ts` file.
