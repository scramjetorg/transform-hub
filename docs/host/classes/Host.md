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
- [csiDispatcher](Host.md#csidispatcher)
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

- [attachDispatcherEvents](Host.md#attachdispatcherevents)
- [attachHostAPIs](Host.md#attachhostapis)
- [cleanup](Host.md#cleanup)
- [connectToCPM](Host.md#connecttocpm)
- [eventBus](Host.md#eventbus)
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
- [handleDispatcherEndEvent](Host.md#handledispatcherendevent)
- [handleDispatcherEstablishedEvent](Host.md#handledispatcherestablishedevent)
- [handleDispatcherTerminatedEvent](Host.md#handledispatcherterminatedevent)
- [handleIncomingSequence](Host.md#handleincomingsequence)
- [handleNewSequence](Host.md#handlenewsequence)
- [handleStartSequence](Host.md#handlestartsequence)
- [handleUpdateSequence](Host.md#handleupdatesequence)
- [heartBeat](Host.md#heartbeat)
- [identifyExistingSequences](Host.md#identifyexistingsequences)
- [instanceMiddleware](Host.md#instancemiddleware)
- [main](Host.md#main)
- [performStartup](Host.md#performstartup)
- [pushTelemetry](Host.md#pushtelemetry)
- [readInfoFile](Host.md#readinfofile)
- [setTelemetry](Host.md#settelemetry)
- [spaceMiddleware](Host.md#spacemiddleware)
- [stop](Host.md#stop)

### Constructors

- [constructor](Host.md#constructor)

## Properties

### adapterName

• **adapterName**: `string` = `"uninitialized"`

#### Defined in

[packages/host/src/lib/host.ts:156](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L156)

___

### api

• **api**: `APIExpose`

The Host's API Server.

#### Defined in

[packages/host/src/lib/host.ts:104](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L104)

___

### apiBase

• **apiBase**: `string`

Api path prefix based on initial configuration.

#### Defined in

[packages/host/src/lib/host.ts:109](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L109)

___

### auditor

• **auditor**: `Auditor`

Host auditor.

#### Defined in

[packages/host/src/lib/host.ts:90](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L90)

___

### commonLogsPipe

• **commonLogsPipe**: [`CommonLogsPipe`](CommonLogsPipe.md)

#### Defined in

[packages/host/src/lib/host.ts:150](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L150)

___

### config

• **config**: `STHConfiguration`

Configuration.

#### Defined in

[packages/host/src/lib/host.ts:99](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L99)

___

### cpmConnector

• `Optional` **cpmConnector**: [`CPMConnector`](CPMConnector.md)

Instance of CPMConnector used to communicate with Manager.

#### Defined in

[packages/host/src/lib/host.ts:123](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L123)

___

### csiDispatcher

• **csiDispatcher**: `CSIDispatcher`

#### Defined in

[packages/host/src/lib/host.ts:163](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L163)

___

### hostSize

• **hostSize**: `HostSizes`

#### Defined in

[packages/host/src/lib/host.ts:154](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L154)

___

### instanceBase

• **instanceBase**: `string`

Instance path prefix.

#### Defined in

[packages/host/src/lib/host.ts:114](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L114)

___

### instancesStore

• **instancesStore**: `Object` = `InstanceStore`

Object to store CSIControllers.

#### Index signature

▪ [key: `string`]: [`CSIController`](CSIController.md)

#### Defined in

[packages/host/src/lib/host.ts:128](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L128)

___

### ipvAddress

• **ipvAddress**: `any`

#### Defined in

[packages/host/src/lib/host.ts:155](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L155)

___

### loadCheck

• **loadCheck**: `LoadCheck`

Instance of class providing load check.

#### Defined in

[packages/host/src/lib/host.ts:143](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L143)

___

### logger

• **logger**: `IObjectLogger`

Instance of class providing logging utilities.

#### Implementation of

IComponent.logger

#### Defined in

[packages/host/src/lib/host.ts:138](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L138)

___

### publicConfig

• **publicConfig**: `PublicSTHConfiguration`

#### Defined in

[packages/host/src/lib/host.ts:152](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L152)

___

### s3Client

• `Optional` **s3Client**: `S3Client`

S3 client.

#### Defined in

[packages/host/src/lib/host.ts:161](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L161)

___

### sequenceStore

• **sequenceStore**: `SequenceStore`

Sequences store.

#### Defined in

[packages/host/src/lib/host.ts:133](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L133)

___

### serviceDiscovery

• **serviceDiscovery**: [`ServiceDiscovery`](ServiceDiscovery.md)

Service to handle topics.

#### Defined in

[packages/host/src/lib/host.ts:148](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L148)

___

### socketServer

• **socketServer**: [`SocketServer`](SocketServer.md)

#### Defined in

[packages/host/src/lib/host.ts:118](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L118)

___

### telemetryAdapter

• `Optional` **telemetryAdapter**: `ITelemetryAdapter`

#### Defined in

[packages/host/src/lib/host.ts:92](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L92)

___

### telemetryEnvironmentName

• **telemetryEnvironmentName**: `string` = `"not-set"`

#### Defined in

[packages/host/src/lib/host.ts:94](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L94)

___

### topicsBase

• **topicsBase**: `string`

#### Defined in

[packages/host/src/lib/host.ts:116](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L116)

## Accessors

### apiVersion

• `get` **apiVersion**(): `string`

#### Returns

`string`

#### Defined in

[packages/host/src/lib/host.ts:173](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L173)

___

### build

• `get` **build**(): `string`

#### Returns

`string`

#### Defined in

[packages/host/src/lib/host.ts:183](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L183)

___

### service

• `get` **service**(): `string`

#### Returns

`string`

#### Defined in

[packages/host/src/lib/host.ts:169](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L169)

___

### version

• `get` **version**(): `string`

#### Returns

`string`

#### Defined in

[packages/host/src/lib/host.ts:179](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L179)

## Methods

### attachDispatcherEvents

▸ **attachDispatcherEvents**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:310](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L310)

___

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

[packages/host/src/lib/host.ts:632](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L632)

___

### cleanup

▸ **cleanup**(): `Promise`<`void`\>

Stops running servers.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:1275](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1275)

___

### connectToCPM

▸ **connectToCPM**(): `Promise`<`void`\>

Initializes connector and connects to Manager.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:604](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L604)

___

### eventBus

▸ **eventBus**(`event`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `EventMessageData` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:1160](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1160)

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

[packages/host/src/lib/host.ts:1024](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1024)

___

### getId

▸ **getId**(): `undefined` \| `string`

#### Returns

`undefined` \| `string`

#### Defined in

[packages/host/src/lib/host.ts:406](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L406)

___

### getInstances

▸ **getInstances**(): `GetInstancesResponse`

Returns list of all Sequences.

#### Returns

`GetInstancesResponse`

List of Instances.

#### Defined in

[packages/host/src/lib/host.ts:1175](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1175)

___

### getSequence

▸ **getSequence**(`req`): `OpResponse`<`GetSequenceResponse`\>

Returns Sequence information.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `req` | `ParsedMessage` | Request object that should contain id parameter inside. |

#### Returns

`OpResponse`<`GetSequenceResponse`\>

Sequence info object.

#### Defined in

[packages/host/src/lib/host.ts:1187](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1187)

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

[packages/host/src/lib/host.ts:1227](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1227)

___

### getSequences

▸ **getSequences**(): `GetSequencesResponse`

Returns list of all Sequences.

#### Returns

`GetSequencesResponse`

List of Sequences.

#### Defined in

[packages/host/src/lib/host.ts:1215](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1215)

___

### getSize

▸ **getSize**(): `HostSizes`

Calculates the machine's T-Shirt size.

#### Returns

`HostSizes`

Size

#### Defined in

[packages/host/src/lib/host.ts:1341](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1341)

___

### getStatus

▸ **getStatus**(): `GetStatusResponse`

#### Returns

`GetStatusResponse`

#### Defined in

[packages/host/src/lib/host.ts:1246](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1246)

___

### getTopics

▸ **getTopics**(): { `contentType`: `ContentType` = value.contentType; `localProvider`: `string` = ""; `topic`: `string` = value.id; `topicName`: `string` = value.id }[]

#### Returns

{ `contentType`: `ContentType` = value.contentType; `localProvider`: `string` = ""; `topic`: `string` = value.id; `topicName`: `string` = value.id }[]

#### Defined in

[packages/host/src/lib/host.ts:1240](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1240)

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

[packages/host/src/lib/host.ts:866](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L866)

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

[packages/host/src/lib/host.ts:772](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L772)

___

### handleDispatcherEndEvent

▸ **handleDispatcherEndEvent**(`instance`): `Promise`<`void`\>

Pass information about ended instance to monitoring and platform services.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `instance` | `DispatcherInstanceEndEventData` | Event details. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:373](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L373)

___

### handleDispatcherEstablishedEvent

▸ **handleDispatcherEstablishedEvent**(`instance`): `Promise`<`void`\>

Check for Sequence.
Pass information about connected instance to monitoring and platform services.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `instance` | `Instance` | Instance data. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:338](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L338)

___

### handleDispatcherTerminatedEvent

▸ **handleDispatcherTerminatedEvent**(`eventData`): `Promise`<`void`\>

Pass information about terminated instance to monitoring services.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventData` | `DispatcherInstanceEndEventData` | Event details. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:395](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L395)

___

### handleIncomingSequence

▸ **handleIncomingSequence**(`req`, `id`): `Promise`<`OpResponse`<`SendSequenceResponse`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `ParsedMessage` |
| `id` | `string` |

#### Returns

`Promise`<`OpResponse`<`SendSequenceResponse`\>\>

#### Defined in

[packages/host/src/lib/host.ts:912](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L912)

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

[packages/host/src/lib/host.ts:1008](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1008)

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

[packages/host/src/lib/host.ts:1067](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1067)

___

### handleUpdateSequence

▸ **handleUpdateSequence**(`req`): `Promise`<`OpResponse`<`SendSequenceResponse`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `ParsedMessage` |

#### Returns

`Promise`<`OpResponse`<`SendSequenceResponse`\>\>

#### Defined in

[packages/host/src/lib/host.ts:976](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L976)

___

### heartBeat

▸ **heartBeat**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:845](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L845)

___

### identifyExistingSequences

▸ **identifyExistingSequences**(): `Promise`<`void`\>

Finds existing Sequences.
Used to recover Sequences information after restart.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:884](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L884)

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

[packages/host/src/lib/host.ts:701](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L701)

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

[packages/host/src/lib/host.ts:453](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L453)

___

### performStartup

▸ **performStartup**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:550](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L550)

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

[packages/host/src/lib/host.ts:1348](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1348)

___

### readInfoFile

▸ **readInfoFile**(): `any`

Reads configuration from file.

#### Returns

`any`

Configuration object.

#### Defined in

[packages/host/src/lib/host.ts:424](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L424)

___

### setTelemetry

▸ **setTelemetry**(): `Promise`<`void`\>

Sets up telemetry.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:1315](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1315)

___

### spaceMiddleware

▸ **spaceMiddleware**(`req`, `res`): `void`

Forward request to Manager the Host is connected to.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `req` | `ParsedMessage` | Request object. |
| `res` | `ServerResponse` | Response object. |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:733](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L733)

___

### stop

▸ **stop**(): `Promise`<`void`\>

Stops all running Instances by sending KILL command to every Instance
using its CSIController [CSIController](CSIController.md)

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:1258](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L1258)

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

[packages/host/src/lib/host.ts:196](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L196)
