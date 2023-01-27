[@scramjet/host](../README.md) / [Exports](../modules.md) / Host

# Class: Host

Host provides functionality to manage Instances and Sequences.
Using provided servers to set up API and server for communicating with Instance controllers.
Can communicate with Manager.

## Implements

- `IComponent`

## Table of contents

### Properties

- [adapterName](Host.md#adaptername)
- [api](Host.md#api)
- [apiBase](Host.md#apibase)
- [auditor](Host.md#auditor)
- [commonLogsPipe](Host.md#commonlogspipe)
- [config](Host.md#config)
- [cpmConnector](Host.md#cpmconnector)
- [hostSize](Host.md#hostsize)
- [instanceBase](Host.md#instancebase)
- [instancesStore](Host.md#instancesstore)
- [ipvAddress](Host.md#ipvaddress)
- [loadCheck](Host.md#loadcheck)
- [logger](Host.md#logger)
- [publicConfig](Host.md#publicconfig)
- [s3Client](Host.md#s3client)
- [sequencesStore](Host.md#sequencesstore)
- [serviceDiscovery](Host.md#servicediscovery)
- [socketServer](Host.md#socketserver)
- [telemetryAdapter](Host.md#telemetryadapter)
- [telemetryEnvironmentName](Host.md#telemetryenvironmentname)
- [topicsBase](Host.md#topicsbase)

### Accessors

- [apiVersion](Host.md#apiversion)
- [build](Host.md#build)
- [service](Host.md#service)
- [version](Host.md#version)

### Methods

- [attachHostAPIs](Host.md#attachhostapis)
- [cleanup](Host.md#cleanup)
- [connectToCPM](Host.md#connecttocpm)
- [getExternalSequence](Host.md#getexternalsequence)
- [getInstances](Host.md#getinstances)
- [getSequence](Host.md#getsequence)
- [getSequenceByName](Host.md#getsequencebyname)
- [getSequenceInstances](Host.md#getsequenceinstances)
- [getSequences](Host.md#getsequences)
- [getSize](Host.md#getsize)
- [getStatus](Host.md#getstatus)
- [getTopics](Host.md#gettopics)
- [handleAuditRequest](Host.md#handleauditrequest)
- [handleDeleteSequence](Host.md#handledeletesequence)
- [handleIncomingSequence](Host.md#handleincomingsequence)
- [handleNewSequence](Host.md#handlenewsequence)
- [handleSequenceUpdate](Host.md#handlesequenceupdate)
- [handleStartSequence](Host.md#handlestartsequence)
- [heartBeat](Host.md#heartbeat)
- [identifyExistingSequences](Host.md#identifyexistingsequences)
- [instanceMiddleware](Host.md#instancemiddleware)
- [main](Host.md#main)
- [performStartup](Host.md#performstartup)
- [pushTelemetry](Host.md#pushtelemetry)
- [setTelemetry](Host.md#settelemetry)
- [startCSIController](Host.md#startcsicontroller)
- [stop](Host.md#stop)
- [topicsMiddleware](Host.md#topicsmiddleware)

### Constructors

- [constructor](Host.md#constructor)

## Properties

### adapterName

• **adapterName**: `string` = `"uninitialized"`

#### Defined in

[packages/host/src/lib/host.ts:135](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L135)

___

### api

• **api**: `APIExpose`

The Host's API Server.

#### Defined in

[packages/host/src/lib/host.ts:83](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L83)

___

### apiBase

• **apiBase**: `string`

Api path prefix based on initial configuration.

#### Defined in

[packages/host/src/lib/host.ts:88](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L88)

___

### auditor

• **auditor**: `Auditor`

Host auditor.

#### Defined in

[packages/host/src/lib/host.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L69)

___

### commonLogsPipe

• **commonLogsPipe**: [`CommonLogsPipe`](CommonLogsPipe.md)

#### Defined in

[packages/host/src/lib/host.ts:129](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L129)

___

### config

• **config**: `STHConfiguration`

Configuration.

#### Defined in

[packages/host/src/lib/host.ts:78](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L78)

___

### cpmConnector

• `Optional` **cpmConnector**: [`CPMConnector`](CPMConnector.md)

Instance of CPMConnector used to communicate with Manager.

#### Defined in

[packages/host/src/lib/host.ts:102](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L102)

___

### hostSize

• **hostSize**: `HostSizes`

#### Defined in

[packages/host/src/lib/host.ts:133](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L133)

___

### instanceBase

• **instanceBase**: `string`

Instance path prefix.

#### Defined in

[packages/host/src/lib/host.ts:93](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L93)

___

### instancesStore

• **instancesStore**: `Object` = `InstanceStore`

Object to store CSIControllers.

#### Index signature

▪ [key: `string`]: [`CSIController`](CSIController.md)

#### Defined in

[packages/host/src/lib/host.ts:107](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L107)

___

### ipvAddress

• **ipvAddress**: `any`

#### Defined in

[packages/host/src/lib/host.ts:134](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L134)

___

### loadCheck

• **loadCheck**: `LoadCheck`

Instance of class providing load check.

#### Defined in

[packages/host/src/lib/host.ts:122](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L122)

___

### logger

• **logger**: `IObjectLogger`

Instance of class providing logging utilities.

#### Implementation of

IComponent.logger

#### Defined in

[packages/host/src/lib/host.ts:117](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L117)

___

### publicConfig

• **publicConfig**: `PublicSTHConfiguration`

#### Defined in

[packages/host/src/lib/host.ts:131](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L131)

___

### s3Client

• `Optional` **s3Client**: `S3Client`

S3 client.

#### Defined in

[packages/host/src/lib/host.ts:140](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L140)

___

### sequencesStore

• **sequencesStore**: `Map`<`string`, `SequenceInfo`\>

Sequences store.

#### Defined in

[packages/host/src/lib/host.ts:112](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L112)

___

### serviceDiscovery

• **serviceDiscovery**: [`ServiceDiscovery`](ServiceDiscovery.md)

Service to handle topics.

#### Defined in

[packages/host/src/lib/host.ts:127](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L127)

___

### socketServer

• **socketServer**: [`SocketServer`](SocketServer.md)

#### Defined in

[packages/host/src/lib/host.ts:97](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L97)

___

### telemetryAdapter

• `Optional` **telemetryAdapter**: `ITelemetryAdapter`

#### Defined in

[packages/host/src/lib/host.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L71)

___

### telemetryEnvironmentName

• **telemetryEnvironmentName**: `string` = `"not-set"`

#### Defined in

[packages/host/src/lib/host.ts:73](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L73)

___

### topicsBase

• **topicsBase**: `string`

#### Defined in

[packages/host/src/lib/host.ts:95](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L95)

## Accessors

### apiVersion

• `get` **apiVersion**(): `string`

#### Returns

`string`

#### Defined in

[packages/host/src/lib/host.ts:165](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L165)

___

### build

• `get` **build**(): `string`

#### Returns

`string`

#### Defined in

[packages/host/src/lib/host.ts:175](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L175)

___

### service

• `get` **service**(): `string`

#### Returns

`string`

#### Defined in

[packages/host/src/lib/host.ts:161](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L161)

___

### version

• `get` **version**(): `string`

#### Returns

`string`

#### Defined in

[packages/host/src/lib/host.ts:171](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L171)

## Methods

### attachHostAPIs

▸ **attachHostAPIs**(): `void`

Setting up handlers for general Host API endpoints:
- creating Sequence (passing stream with the compressed package)
- starting Instance (based on a given Sequence ID passed in the HTTP request body)
- getting Sequence details
- listing all Instances running on the CSH
- listing all Sequences saved on the CSH
- Instance

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:409](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L409)

___

### cleanup

▸ **cleanup**(): `Promise`<`void`\>

Stops running servers.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:1081](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1081)

___

### connectToCPM

▸ **connectToCPM**(): `Promise`<`void`\>

Initializes connector and connects to Manager.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:381](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L381)

___

### getExternalSequence

▸ **getExternalSequence**(`id`): `Promise`<`SequenceInfo`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`Promise`<`SequenceInfo`\>

#### Defined in

[packages/host/src/lib/host.ts:758](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L758)

___

### getInstances

▸ **getInstances**(): `GetInstancesResponse`

Returns list of all Sequences.

#### Returns

`GetInstancesResponse`

List of Instances.

#### Defined in

[packages/host/src/lib/host.ts:980](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L980)

___

### getSequence

▸ **getSequence**(`id`): `OpResponse`<`GetSequenceResponse`\>

Returns Sequence information.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `string` | Instance ID. |

#### Returns

`OpResponse`<`GetSequenceResponse`\>

Sequence info object.

#### Defined in

[packages/host/src/lib/host.ts:992](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L992)

___

### getSequenceByName

▸ **getSequenceByName**(`sequenceName`): `undefined` \| `SequenceInfo`

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequenceName` | `string` |

#### Returns

`undefined` \| `SequenceInfo`

#### Defined in

[packages/host/src/lib/host.ts:745](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L745)

___

### getSequenceInstances

▸ **getSequenceInstances**(`sequenceId`): `GetSequenceInstancesResponse`

Returns list of all Instances of given Sequence.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequenceId` | `string` | Sequence ID. |

#### Returns

`GetSequenceInstancesResponse`

List of Instances.

#### Defined in

[packages/host/src/lib/host.ts:1033](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1033)

___

### getSequences

▸ **getSequences**(): `GetSequencesResponse`

Returns list of all Sequences.

#### Returns

`GetSequencesResponse`

List of Sequences.

#### Defined in

[packages/host/src/lib/host.ts:1016](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1016)

___

### getSize

▸ **getSize**(): `HostSizes`

Calculates the machine's T-Shirt size.

#### Returns

`HostSizes`

Size

#### Defined in

[packages/host/src/lib/host.ts:1147](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1147)

___

### getStatus

▸ **getStatus**(): `GetStatusResponse`

#### Returns

`GetStatusResponse`

#### Defined in

[packages/host/src/lib/host.ts:1052](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1052)

___

### getTopics

▸ **getTopics**(): { `contentType`: `string` = value.contentType; `localProvider`: `undefined` \| `string` = value.localProvider; `topic`: `string` = key }[]

#### Returns

{ `contentType`: `string` = value.contentType; `localProvider`: `undefined` \| `string` = value.localProvider; `topic`: `string` = key }[]

#### Defined in

[packages/host/src/lib/host.ts:1046](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1046)

___

### handleAuditRequest

▸ **handleAuditRequest**(`req`, `res`): `Promise`<`Readable`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `ParsedMessage` |
| `res` | `ServerResponse` |

#### Returns

`Promise`<`Readable`\>

#### Defined in

[packages/host/src/lib/host.ts:590](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L590)

___

### handleDeleteSequence

▸ **handleDeleteSequence**(`req`): `Promise`<`OpResponse`<`DeleteSequenceResponse`\>\>

Handles delete Sequence request.
Removes Sequence from the store and sends notification to Manager if connected.
Note: If Instance is started from a given Sequence, Sequence can not be removed
and CONFLICT status code is returned.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `req` | `ParsedMessage` | Request object. |

#### Returns

`Promise`<`OpResponse`<`DeleteSequenceResponse`\>\>

Promise resolving to operation result object.

#### Defined in

[packages/host/src/lib/host.ts:514](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L514)

___

### handleIncomingSequence

▸ **handleIncomingSequence**(`stream`, `id`): `Promise`<`OpResponse`<`SendSequenceResponse`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `ParsedMessage` |
| `id` | `string` |

#### Returns

`Promise`<`OpResponse`<`SendSequenceResponse`\>\>

#### Defined in

[packages/host/src/lib/host.ts:627](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L627)

___

### handleNewSequence

▸ **handleNewSequence**(`stream`, `id?`): `Promise`<`OpResponse`<`SendSequenceResponse`\>\>

Handles incoming Sequence.
Uses Sequence adapter to unpack and identify Sequence.
Notifies Manager (if connected) about new Sequence.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `ParsedMessage` | Stream of packaged Sequence. |
| `id` | `string` | Sequence id. |

#### Returns

`Promise`<`OpResponse`<`SendSequenceResponse`\>\>

Promise resolving to operation result.

#### Defined in

[packages/host/src/lib/host.ts:725](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L725)

___

### handleSequenceUpdate

▸ **handleSequenceUpdate**(`stream`): `Promise`<`OpResponse`<`SendSequenceResponse`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `ParsedMessage` |

#### Returns

`Promise`<`OpResponse`<`SendSequenceResponse`\>\>

#### Defined in

[packages/host/src/lib/host.ts:691](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L691)

___

### handleStartSequence

▸ **handleStartSequence**(`req`): `Promise`<`OpResponse`<`StartSequenceResponse`\>\>

Handles Sequence start request.
Parses request body for Sequence configuration and parameters to be passed to first Sequence method.
Passes obtained parameters to main method staring Sequence.

Notifies Manager (if connected) about new Instance.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `req` | `ParsedMessage` | Request object. |

#### Returns

`Promise`<`OpResponse`<`StartSequenceResponse`\>\>

Promise resolving to operation result object.

#### Defined in

[packages/host/src/lib/host.ts:798](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L798)

___

### heartBeat

▸ **heartBeat**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:569](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L569)

___

### identifyExistingSequences

▸ **identifyExistingSequences**(): `Promise`<`void`\>

Finds existing Sequences.
Used to recover Sequences information after restart.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:608](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L608)

___

### instanceMiddleware

▸ **instanceMiddleware**(`req`, `res`, `next`): `void`

Finds Instance with given id passed in request parameters and forwards request to Instance router.
Forwarded request's url is reduced by the Instance base path and Instance parameter.
For example: /api/instance/:id/log -> /log

Ends response with 404 if Instance is not found.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `req` | `ParsedMessage` | Request object. |
| `res` | `ServerResponse` | Response object. |
| `next` | `NextCallback` | Function to call when request is not handled by Instance middleware. |

#### Returns

`void`

Instance middleware.

#### Defined in

[packages/host/src/lib/host.ts:473](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L473)

___

### main

▸ **main**(): `Promise`<`void`\>

Main method to start Host.
Performs Hosts's initialization process: starts servers, identifies existing Instances,
sets up API and connects to Manager.

#### Returns

`Promise`<`void`\>

Promise resolving to Instance of Host.

#### Defined in

[packages/host/src/lib/host.ts:249](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L249)

___

### performStartup

▸ **performStartup**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:329](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L329)

___

### pushTelemetry

▸ **pushTelemetry**(`message`, `labels?`, `level?`): `void`

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `message` | `string` | `undefined` |
| `labels` | `Object` | `{}` |
| `level` | ``"error"`` \| ``"info"`` | `"info"` |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:1154](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1154)

___

### setTelemetry

▸ **setTelemetry**(): `Promise`<`void`\>

Sets up telemetry.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:1121](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1121)

___

### startCSIController

▸ **startCSIController**(`sequence`, `payload`): `Promise`<[`CSIController`](CSIController.md)\>

Creates new CSIController [CSIController](CSIController.md) object and handles its events.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `sequence` | `SequenceInfo` | Sequence info object. |
| `payload` | `StartSequencePayload` | App start configuration. |

#### Returns

`Promise`<[`CSIController`](CSIController.md)\>

#### Defined in

[packages/host/src/lib/host.ts:868](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L868)

___

### stop

▸ **stop**(): `Promise`<`void`\>

Stops all running Instances by sending KILL command to every Instance
using its CSIController [CSIController](CSIController.md)

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:1064](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1064)

___

### topicsMiddleware

▸ **topicsMiddleware**(`req`, `res`, `next`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `ParsedMessage` |
| `res` | `ServerResponse` |
| `next` | `NextCallback` |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:499](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L499)

## Constructors

### constructor

• **new Host**(`apiServer`, `socketServer`, `sthConfig`)

Initializes Host.
Sets used modules with provided configuration.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `apiServer` | `APIExpose` | Server to attach API to. |
| `socketServer` | [`SocketServer`](SocketServer.md) | Server to listen for connections from Instances. |
| `sthConfig` | `STHConfiguration` | Configuration. |

#### Defined in

[packages/host/src/lib/host.ts:187](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L187)
