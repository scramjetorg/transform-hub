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
- [sequenceStore](Host.md#sequencestore)
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
- [getId](Host.md#getid)
- [getInstances](Host.md#getinstances)
- [getSequence](Host.md#getsequence)
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
- [readInfoFile](Host.md#readinfofile)
- [setTelemetry](Host.md#settelemetry)
- [spaceMiddleware](Host.md#spacemiddleware)
- [startCSIController](Host.md#startcsicontroller)
- [stop](Host.md#stop)

### Constructors

- [constructor](Host.md#constructor)

## Properties

### adapterName

• **adapterName**: `string` = `"uninitialized"`

#### Defined in

[packages/host/src/lib/host.ts:142](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L142)

___

### api

• **api**: `APIExpose`

The Host's API Server.

#### Defined in

[packages/host/src/lib/host.ts:90](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L90)

___

### apiBase

• **apiBase**: `string`

Api path prefix based on initial configuration.

#### Defined in

[packages/host/src/lib/host.ts:95](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L95)

___

### auditor

• **auditor**: `Auditor`

Host auditor.

#### Defined in

[packages/host/src/lib/host.ts:76](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L76)

___

### commonLogsPipe

• **commonLogsPipe**: [`CommonLogsPipe`](CommonLogsPipe.md)

#### Defined in

[packages/host/src/lib/host.ts:136](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L136)

___

### config

• **config**: `STHConfiguration`

Configuration.

#### Defined in

[packages/host/src/lib/host.ts:85](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L85)

___

### cpmConnector

• `Optional` **cpmConnector**: [`CPMConnector`](CPMConnector.md)

Instance of CPMConnector used to communicate with Manager.

#### Defined in

[packages/host/src/lib/host.ts:109](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L109)

___

### hostSize

• **hostSize**: `HostSizes`

#### Defined in

[packages/host/src/lib/host.ts:140](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L140)

___

### instanceBase

• **instanceBase**: `string`

Instance path prefix.

#### Defined in

[packages/host/src/lib/host.ts:100](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L100)

___

### instancesStore

• **instancesStore**: `Object` = `InstanceStore`

Object to store CSIControllers.

#### Index signature

▪ [key: `string`]: [`CSIController`](CSIController.md)

#### Defined in

[packages/host/src/lib/host.ts:114](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L114)

___

### ipvAddress

• **ipvAddress**: `any`

#### Defined in

[packages/host/src/lib/host.ts:141](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L141)

___

### loadCheck

• **loadCheck**: `LoadCheck`

Instance of class providing load check.

#### Defined in

[packages/host/src/lib/host.ts:129](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L129)

___

### logger

• **logger**: `IObjectLogger`

Instance of class providing logging utilities.

#### Implementation of

IComponent.logger

#### Defined in

[packages/host/src/lib/host.ts:124](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L124)

___

### publicConfig

• **publicConfig**: `PublicSTHConfiguration`

#### Defined in

[packages/host/src/lib/host.ts:138](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L138)

___

### s3Client

• `Optional` **s3Client**: `S3Client`

S3 client.

#### Defined in

[packages/host/src/lib/host.ts:147](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L147)

___

### sequenceStore

• **sequenceStore**: `SequenceStore`

Sequences store.

#### Defined in

[packages/host/src/lib/host.ts:119](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L119)

___

### serviceDiscovery

• **serviceDiscovery**: [`ServiceDiscovery`](ServiceDiscovery.md)

Service to handle topics.

#### Defined in

[packages/host/src/lib/host.ts:134](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L134)

___

### socketServer

• **socketServer**: [`SocketServer`](SocketServer.md)

#### Defined in

[packages/host/src/lib/host.ts:104](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L104)

___

### telemetryAdapter

• `Optional` **telemetryAdapter**: `ITelemetryAdapter`

#### Defined in

[packages/host/src/lib/host.ts:78](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L78)

___

### telemetryEnvironmentName

• **telemetryEnvironmentName**: `string` = `"not-set"`

#### Defined in

[packages/host/src/lib/host.ts:80](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L80)

___

### topicsBase

• **topicsBase**: `string`

#### Defined in

[packages/host/src/lib/host.ts:102](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L102)

## Accessors

### apiVersion

• `get` **apiVersion**(): `string`

#### Returns

`string`

#### Defined in

[packages/host/src/lib/host.ts:170](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L170)

___

### build

• `get` **build**(): `string`

#### Returns

`string`

#### Defined in

[packages/host/src/lib/host.ts:180](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L180)

___

### service

• `get` **service**(): `string`

#### Returns

`string`

#### Defined in

[packages/host/src/lib/host.ts:166](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L166)

___

### version

• `get` **version**(): `string`

#### Returns

`string`

#### Defined in

[packages/host/src/lib/host.ts:176](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L176)

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

[packages/host/src/lib/host.ts:468](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L468)

___

### cleanup

▸ **cleanup**(): `Promise`<`void`\>

Stops running servers.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:1160](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1160)

___

### connectToCPM

▸ **connectToCPM**(): `Promise`<`void`\>

Initializes connector and connects to Manager.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:440](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L440)

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

[packages/host/src/lib/host.ts:835](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L835)

___

### getId

▸ **getId**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Defined in

[packages/host/src/lib/host.ts:251](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L251)

___

### getInstances

▸ **getInstances**(): `GetInstancesResponse`

Returns list of all Sequences.

#### Returns

`GetInstancesResponse`

List of Instances.

#### Defined in

[packages/host/src/lib/host.ts:1064](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1064)

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

[packages/host/src/lib/host.ts:1076](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1076)

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

[packages/host/src/lib/host.ts:1112](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1112)

___

### getSequences

▸ **getSequences**(): `GetSequencesResponse`

Returns list of all Sequences.

#### Returns

`GetSequencesResponse`

List of Sequences.

#### Defined in

[packages/host/src/lib/host.ts:1100](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1100)

___

### getSize

▸ **getSize**(): `HostSizes`

Calculates the machine's T-Shirt size.

#### Returns

`HostSizes`

Size

#### Defined in

[packages/host/src/lib/host.ts:1226](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1226)

___

### getStatus

▸ **getStatus**(): `GetStatusResponse`

#### Returns

`GetStatusResponse`

#### Defined in

[packages/host/src/lib/host.ts:1131](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1131)

___

### getTopics

▸ **getTopics**(): { `contentType`: `ContentType` = value.contentType; `localProvider`: `string` = ""; `topic`: `string` = value.id; `topicName`: `string` = value.id }[]

#### Returns

{ `contentType`: `ContentType` = value.contentType; `localProvider`: `string` = ""; `topic`: `string` = value.id; `topicName`: `string` = value.id }[]

#### Defined in

[packages/host/src/lib/host.ts:1125](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1125)

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

[packages/host/src/lib/host.ts:684](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L684)

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

[packages/host/src/lib/host.ts:597](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L597)

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

[packages/host/src/lib/host.ts:723](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L723)

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

[packages/host/src/lib/host.ts:815](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L815)

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

[packages/host/src/lib/host.ts:787](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L787)

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

[packages/host/src/lib/host.ts:876](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L876)

___

### heartBeat

▸ **heartBeat**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:663](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L663)

___

### identifyExistingSequences

▸ **identifyExistingSequences**(): `Promise`<`void`\>

Finds existing Sequences.
Used to recover Sequences information after restart.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:702](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L702)

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

[packages/host/src/lib/host.ts:534](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L534)

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

[packages/host/src/lib/host.ts:298](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L298)

___

### performStartup

▸ **performStartup**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:387](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L387)

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

[packages/host/src/lib/host.ts:1233](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1233)

___

### readInfoFile

▸ **readInfoFile**(): `any`

Reads configuration from file.

#### Returns

`any`

Configuration object.

#### Defined in

[packages/host/src/lib/host.ts:269](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L269)

___

### setTelemetry

▸ **setTelemetry**(): `Promise`<`void`\>

Sets up telemetry.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:1200](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1200)

___

### spaceMiddleware

▸ **spaceMiddleware**(`req`, `res`, `_next`): `void`

Forward request to Manager the Host is connected to.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `req` | `ParsedMessage` | Request object. |
| `res` | `ServerResponse` | Response object. |
| `_next` | `NextCallback` | Function to call when request is not handled by Instance middleware. |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:566](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L566)

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

[packages/host/src/lib/host.ts:957](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L957)

___

### stop

▸ **stop**(): `Promise`<`void`\>

Stops all running Instances by sending KILL command to every Instance
using its CSIController [CSIController](CSIController.md)

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:1143](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1143)

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

[packages/host/src/lib/host.ts:192](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L192)
