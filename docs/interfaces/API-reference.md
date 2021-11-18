<!--

---
slug: "/docs/api-reference"
title: Scramjet Transform Hub API
description: Scramjet Transform Hub API
type: "docs"
---

-->

<!-- markdownlint-disable-file MD033 -->

# Scramjet Transform Hub API <!-- omit in toc -->

- [Sequence operations](#sequence-operations)
- [Instance basic operations](#instance-basic-operations)
- [Instance advanced operation](#instance-advanced-operation)
- [Data management](#data-management)
- [Host operations](#host-operations)

## Sequence operations

<details open>
<summary>
    <strong>[ POST ]</strong> <code>/api/v1/sequence</code> <small>- create a new sequence</small>
</summary>

<br><strong>**Parameters**</strong>

| Name      | Description                         | Type   | Required |
| --------- | ----------------------------------- | ------ | -------- |
| file      | compressed package in tar.gz format | binary | yes      |
| appConfig | additional package.json config file | json   | no       |

<strong>Responses</strong>

<small>Status: 202 Accepted</small>

```json
{
  "id": "2c3068e5-7c74-45bb-a017-1979c41fc6d0" // sequence id
}
```

</details>

<details open>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/sequences</code> <small>- show list of sequences</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Successful operation code: **200**</small>

```json
[
  {
    "instances": [
      "742d2713-7ab6-4cde-82f3-a7beabdd4e98"       // list of sequence instances
    ],
    "id": "bdef63db-d3a0-45c8-85db-e94ebb96097f",  // sequence id
    "config": {
      "container": {
        "image": "scramjetorg/runner:0.12.2",
        "maxMem": 512
      },
      "name": "@scramjet/transform-hub",
      "version": "0.12.2",
      "engines": {},
      "config": {},
      "sequencePath": "index.js",
      "packageVolumeId": "bdef63db-d3a0-45c8-85db-e94ebb96097f"
    }
  }
]
```

</details>

<details open>
<summary>
    <strong>[ POST ]</strong> <code>/api/v1/sequence/:id/start</code> <small>- start chosen sequence</small>
</summary>

<br> <strong>**Parameters**</strong>

| Name      | Description                                           | Type | Required |
| --------- | ----------------------------------------------------- | ---- | -------- |
| appConfig | additional package.json config file                   | json | no       |
| args      | additional arguments that instance should starts with | json | no       |

<strong>Responses</strong>

<small>Successful operation code: **200**</small>

```json
{
  "id": "681c856e-dfa4-46a1-951d-47b27345552e"
}
```

</details>

<details open>
<summary>
    <strong>[ DELETE ]</strong> <code>/api/v1/sequence/:id</code> <small>- delete a sequence by id</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>*Status*: 200 Success</small>

```json
{
  "id": "2c3068e5-7c74-45bb-a017-1979c41fc6d0"
}
```

<small>*Status*: 409 Conflict</small>

```json
{
  "error": "Can't remove sequence in use."
}
```

</details>

## Instance basic operations

<details open>
<summary>
    <strong>[ GET ]</strong> <code>/api/v1/instances</code> <small>- list all instances</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Successful operation code: **200**</small>

```json
[
  {
    "id": "742d2713-7ab6-4cde-82f3-a7beabdd4e98",
    "sequence": "bdef63db-d3a0-45c8-85db-e94ebb96097f"
  },
  {
    "id": "681c856e-dfa4-46a1-951d-47b27345552e",
    "sequence": "bdef63db-d3a0-45c8-85db-e94ebb96097f"
  },
  {
    "id": "21f787ed-6b9e-4e9f-828e-afe428d84833",
    "sequence": "bdef63db-d3a0-45c8-85db-e94ebb96097f"
  }
]
```

</details>

<details open>
<summary>
    <strong>[ GET ]</strong> <code>/api/v1/instance/:id</code> <small>- show data of chosen instance</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>*Status*: 200 Accepted</small>

```json
{
  "created": "2021-10-29T16:08:36.524Z",
  "started": "2021-10-29T16:08:38.701Z",
  "sequenceId": "b0c02fdc-b05f-4f26-9d68-43a702eb7b44"
}
```

<small>Status*: ??</small>

```json
{
 // Bug: a query is hanging, when the instance was stopped or the program execution ended
}
```

</details>

<details open>
<summary>
    <strong>[ POST ]</strong> <code>/api/v1/instance/:id/_stop</code> <small>- end instance gracefully and prolong operations or not for task completion​</small>
</summary>

<br> <strong>**Parameters**</strong>

| Name | Description | Type | Required |
| ---- | ----------- | ---- | -------- |
|      |             |      |          |

<strong>Responses</strong>

<small>Successful operation code: **200**</small>

```json
{
   "code": 0,
   "type": "string",
   "message": "string"
}
```

</details>

<details open>
<summary>
    <strong>[ POST ]</strong>  <code>api/v1/instance/:id/_kill</code> <small>- end instance gracefully waiting for unfinished tasks</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>*Status*: 202 Accepted</small>

```text
No body returned
```

</details>

<details open>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/instance/:id/health</code> <small>- check status about instance health</small>
</summary>

<br> <strong>**Parameters**</strong>

No parameters

<strong>Responses</strong>

<small>Successful operation code: **200**</small>

```json
{
  "cpuTotalUsage": 529325247,
  "healthy": true,
  "limit": 536870912,
  "memoryMaxUsage": 16117760,
  "memoryUsage": 14155776,
  "networkRx": 1086,
  "networkTx": 0,
  "containerId": "1c993c4ff774fac06185aa9554cf40c23b03e1479a7e0d14827708161b08ae51"
}
```

</details>

## Instance advanced operation

STH allows you to interact ( communicate ) with an instance by sending events with or without any information defined in the object​. As well as providing and receiving stream with all kinds of data files.

Event contains <eventName>, <handler> with optional <message> of any type: string, num, json obj, array, etc..

<details>
<summary>
    <strong>[ POST ]</strong>  <code>/api/v1/instance/:id/event</code> <small>- send event</small>
</summary>

<br> <strong>**Parameters**</strong>

| Name        | Type     | Description | Required |
| :---------- | :------- | ----------- | -------- |
| `eventName` | `string` |             |          |
| `message`   | `string` |             |          |

<strong>Responses</strong>

<small>Content-type: application/octet-stream</small>

</details>

<details>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/instance/:id/event</code> <small>- get last event</small>
</summary>

<br> <strong>**Parameters**</strong>

<strong>Responses</strong>

<small>Successful operation code: **200**</small>

```json

```

</details>

<details>
<summary>
    <strong>[ POST ]</strong>  <code>/api/v1/instance/:id/stdin​</code> <small>- ...</small>
</summary>

<br> <strong>**Parameters**</strong>

| Name | Description | Type | Required |
| ---- | ----------- | ---- | -------- |
|      |             |      |          |

<strong>Responses</strong>

<small>Content-type: application/octet-stream</small>

</details>

<details>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/instance/:id/stdout</code> <small>- ...</small>
</summary>

<br> <strong>**Parameters**</strong>

| Name | Description | Type | Required |
| ---- | ----------- | ---- | -------- |
|      |             |      |          |

<strong>Responses</strong>

<small>Content-type: application/octet-stream</small>

</details>

<details>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/instance/:id/stderr</code> <small>- ...</small>
</summary>

<br> <strong>**Parameters**</strong>

| Name | Description | Type | Required |
| ---- | ----------- | ---- | -------- |
|      |             |      |          |

<strong>Responses</strong>

<small>Content-type: application/octet-stream</small>

</details>

## Data management

<!-- ToDo: Topics -->

## Host operations

<details>
<summary>
    <strong>[ GET ]</strong>  <code>/api/v1/stream/log</code> <small>- stream all host logs</small>
</summary>

<br> <strong>**Parameters**</strong>

| Name | Description | Type | Required |
| ---- | ----------- | ---- | -------- |
|      |             |      |          |

<strong>Responses</strong>

<small>Content-type: application/octet-stream</small>

</details>
