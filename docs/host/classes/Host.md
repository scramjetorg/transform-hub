[@scramjet/host](../README.md) / Host

# Class: Host

## Implements

- `IComponent`

## Table of contents

### Constructors

- [constructor](Host.md#constructor)

### Properties

- [api](Host.md#api)
- [apiBase](Host.md#apibase)
- [commonLogsPipe](Host.md#commonlogspipe)
- [config](Host.md#config)
- [cpmConnector](Host.md#cpmconnector)
- [instanceBase](Host.md#instancebase)
- [instancesStore](Host.md#instancesstore)
- [loadCheck](Host.md#loadcheck)
- [logger](Host.md#logger)
- [sequencesStore](Host.md#sequencesstore)
- [serviceDiscovery](Host.md#servicediscovery)
- [socketServer](Host.md#socketserver)

### Methods

- [attachHostAPIs](Host.md#attachhostapis)
- [cleanup](Host.md#cleanup)
- [connectToCPM](Host.md#connecttocpm)
- [getInstances](Host.md#getinstances)
- [getSequence](Host.md#getsequence)
- [getSequenceInstances](Host.md#getsequenceinstances)
- [getSequences](Host.md#getsequences)
- [handleDeleteSequence](Host.md#handledeletesequence)
- [handleNewSequence](Host.md#handlenewsequence)
- [handleStartSequence](Host.md#handlestartsequence)
- [identifyExistingSequences](Host.md#identifyexistingsequences)
- [instanceMiddleware](Host.md#instancemiddleware)
- [main](Host.md#main)
- [startCSIController](Host.md#startcsicontroller)
- [stop](Host.md#stop)

## Constructors

### constructor

• **new Host**(`apiServer`, `socketServer`, `sthConfig`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiServer` | `APIExpose` |
| `socketServer` | [`SocketServer`](SocketServer.md) |
| `sthConfig` | `STHConfiguration` |

#### Defined in

[packages/host/src/lib/host.ts:56](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L56)

## Properties

### api

• **api**: `APIExpose`

#### Defined in

[packages/host/src/lib/host.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L30)

___

### apiBase

• **apiBase**: `string`

#### Defined in

[packages/host/src/lib/host.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L32)

___

### commonLogsPipe

• **commonLogsPipe**: [`CommonLogsPipe`](CommonLogsPipe.md)

#### Defined in

[packages/host/src/lib/host.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L46)

___

### config

• **config**: `STHConfiguration`

#### Defined in

[packages/host/src/lib/host.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L28)

___

### cpmConnector

• `Optional` **cpmConnector**: [`CPMConnector`](CPMConnector.md)

#### Defined in

[packages/host/src/lib/host.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L36)

___

### instanceBase

• **instanceBase**: `string`

#### Defined in

[packages/host/src/lib/host.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L33)

___

### instancesStore

• **instancesStore**: `Object` = `InstanceStore`

#### Index signature

▪ [key: `string`]: [`CSIController`](CSIController.md)

#### Defined in

[packages/host/src/lib/host.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L38)

___

### loadCheck

• **loadCheck**: `LoadCheck`

#### Defined in

[packages/host/src/lib/host.ts:42](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L42)

___

### logger

• **logger**: `Console`

#### Implementation of

IComponent.logger

#### Defined in

[packages/host/src/lib/host.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L41)

___

### sequencesStore

• **sequencesStore**: `Map`<`string`, `SequenceInfo`\>

#### Defined in

[packages/host/src/lib/host.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L39)

___

### serviceDiscovery

• **serviceDiscovery**: [`ServiceDiscovery`](ServiceDiscovery.md)

#### Defined in

[packages/host/src/lib/host.ts:44](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L44)

___

### socketServer

• **socketServer**: [`SocketServer`](SocketServer.md)

#### Defined in

[packages/host/src/lib/host.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L35)

## Methods

### attachHostAPIs

▸ **attachHostAPIs**(): `void`

Setting up handlers for general Host API endpoints:

- creating Sequence (passing stream with the compressed package)
- starting Instance (based on a given Sequence ID passed in the HTTP request body)
- getting sequence details
- listing all instances running on the CSH
- listing all sequences saved on the CSH
- instance

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:145](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L145)

___

### cleanup

▸ **cleanup**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:515](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L515)

___

### connectToCPM

▸ **connectToCPM**(): `void`

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:124](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L124)

___

### getInstances

▸ **getInstances**(): `GetInstancesResponse`

#### Returns

`GetInstancesResponse`

#### Defined in

[packages/host/src/lib/host.ts:458](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L458)

___

### getSequence

▸ **getSequence**(`id`): `GetSequenceResponse`

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`GetSequenceResponse`

#### Defined in

[packages/host/src/lib/host.ts:467](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L467)

___

### getSequenceInstances

▸ **getSequenceInstances**(`sequenceId`): `GetSequenceInstancesResponse`

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequenceId` | `string` |

#### Returns

`GetSequenceInstancesResponse`

#### Defined in

[packages/host/src/lib/host.ts:490](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L490)

___

### getSequences

▸ **getSequences**(): `GetSequencesResponse`

#### Returns

`GetSequencesResponse`

#### Defined in

[packages/host/src/lib/host.ts:481](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L481)

___

### handleDeleteSequence

▸ **handleDeleteSequence**(`req`): `Promise`<`DeleteSequenceResponse`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `ParsedMessage` |

#### Returns

`Promise`<`DeleteSequenceResponse`\>

#### Defined in

[packages/host/src/lib/host.ts:223](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L223)

___

### handleNewSequence

▸ **handleNewSequence**(`stream`): `Promise`<`SendSequenceResponse`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `IncomingMessage` |

#### Returns

`Promise`<`SendSequenceResponse`\>

#### Defined in

[packages/host/src/lib/host.ts:284](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L284)

___

### handleStartSequence

▸ **handleStartSequence**(`req`): `Promise`<`StartSequenceResponse`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `ParsedMessage` |

#### Returns

`Promise`<`StartSequenceResponse`\>

#### Defined in

[packages/host/src/lib/host.ts:314](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L314)

___

### identifyExistingSequences

▸ **identifyExistingSequences**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:265](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L265)

___

### instanceMiddleware

▸ **instanceMiddleware**(`req`, `res`, `next`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `ParsedMessage` |
| `res` | `ServerResponse` |
| `next` | `NextCallback` |

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:196](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L196)

___

### main

▸ **main**(`__namedParameters?`): `Promise`<[`Host`](Host.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Partial`<`Object`\> |

#### Returns

`Promise`<[`Host`](Host.md)\>

#### Defined in

[packages/host/src/lib/host.ts:87](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L87)

___

### startCSIController

▸ **startCSIController**(`sequence`, `appConfig`, `sequenceArgs?`): `Promise`<[`CSIController`](CSIController.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequence` | `SequenceInfo` |
| `appConfig` | `AppConfig` |
| `sequenceArgs?` | `any`[] |

#### Returns

`Promise`<[`CSIController`](CSIController.md)\>

#### Defined in

[packages/host/src/lib/host.ts:361](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L361)

___

### stop

▸ **stop**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:501](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/host/src/lib/host.ts#L501)
