[@scramjet/host](../README.md) / [host](../modules/host.md) / Host

# Class: Host

[host](../modules/host.md).Host

## Implements

- `IComponent`

## Table of contents

### Constructors

- [constructor](host.Host.md#constructor)

### Properties

- [api](host.Host.md#api)
- [apiBase](host.Host.md#apibase)
- [config](host.Host.md#config)
- [cpmConnected](host.Host.md#cpmconnected)
- [cpmConnector](host.Host.md#cpmconnector)
- [instanceBase](host.Host.md#instancebase)
- [instancesStore](host.Host.md#instancesstore)
- [logger](host.Host.md#logger)
- [sequencesStore](host.Host.md#sequencesstore)
- [socketServer](host.Host.md#socketserver)

### Methods

- [attachHostAPIs](host.Host.md#attachhostapis)
- [connectToCPM](host.Host.md#connecttocpm)
- [getCSIControllers](host.Host.md#getcsicontrollers)
- [getLoad](host.Host.md#getload)
- [getSequence](host.Host.md#getsequence)
- [getSequenceInstances](host.Host.md#getsequenceinstances)
- [getSequences](host.Host.md#getsequences)
- [handleDeleteSequence](host.Host.md#handledeletesequence)
- [handleNewSequence](host.Host.md#handlenewsequence)
- [handleStartSequence](host.Host.md#handlestartsequence)
- [identifyExistingSequences](host.Host.md#identifyexistingsequences)
- [identifySequence](host.Host.md#identifysequence)
- [instanceMiddleware](host.Host.md#instancemiddleware)
- [main](host.Host.md#main)
- [startCSIController](host.Host.md#startcsicontroller)

## Constructors

### constructor

• **new Host**(`apiServer`, `socketServer`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiServer` | `APIExpose` |
| `socketServer` | [`SocketServer`](socket_server.SocketServer.md) |

#### Defined in

[packages/host/src/lib/host.ts:60](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L60)

## Properties

### api

• **api**: `APIExpose`

#### Defined in

[packages/host/src/lib/host.ts:38](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L38)

___

### apiBase

• **apiBase**: `string`

#### Defined in

[packages/host/src/lib/host.ts:40](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L40)

___

### config

• **config**: `STHConfiguration`

#### Defined in

[packages/host/src/lib/host.ts:36](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L36)

___

### cpmConnected

• **cpmConnected**: `boolean` = `false`

#### Defined in

[packages/host/src/lib/host.ts:45](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L45)

___

### cpmConnector

• `Optional` **cpmConnector**: [`CPMConnector`](cpm_connector.CPMConnector.md)

#### Defined in

[packages/host/src/lib/host.ts:44](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L44)

___

### instanceBase

• **instanceBase**: `string`

#### Defined in

[packages/host/src/lib/host.ts:41](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L41)

___

### instancesStore

• **instancesStore**: `Object`

#### Index signature

▪ [key: `string`]: [`CSIController`](csi_controller.CSIController.md)

#### Defined in

[packages/host/src/lib/host.ts:47](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L47)

___

### logger

• **logger**: `Console`

#### Implementation of

IComponent.logger

#### Defined in

[packages/host/src/lib/host.ts:50](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L50)

___

### sequencesStore

• **sequencesStore**: [`SequenceStore`](sequence_store.SequenceStore.md)

#### Defined in

[packages/host/src/lib/host.ts:48](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L48)

___

### socketServer

• **socketServer**: [`SocketServer`](socket_server.SocketServer.md)

#### Defined in

[packages/host/src/lib/host.ts:43](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L43)

## Methods

### attachHostAPIs

▸ **attachHostAPIs**(): `void`

Setting up handlers for general Host API endpoints:
- creating Sequence (passing stream with the compressed package)
- starting Instance (based on a given Sequence ID passed in the HTTP request body)
- getting sequence details
- listing all instances running on the CSH
- listing all sequences saved on the CSH
- intance

#### Returns

`void`

#### Defined in

[packages/host/src/lib/host.ts:178](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L178)

___

### connectToCPM

▸ **connectToCPM**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:134](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L134)

___

### getCSIControllers

▸ **getCSIControllers**(): { `id`: `string` ; `sequence`: [`Sequence`](sequence.Sequence.md) ; `status`: `undefined` \| `FunctionDefinition`[]  }[]

#### Returns

{ `id`: `string` ; `sequence`: [`Sequence`](sequence.Sequence.md) ; `status`: `undefined` \| `FunctionDefinition`[]  }[]

#### Defined in

[packages/host/src/lib/host.ts:353](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L353)

___

### getLoad

▸ **getLoad**(): `Promise`<`LoadCheckStatMessage`\>

#### Returns

`Promise`<`LoadCheckStatMessage`\>

#### Defined in

[packages/host/src/lib/host.ts:121](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L121)

___

### getSequence

▸ **getSequence**(`id`): `ISequence`

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`ISequence`

#### Defined in

[packages/host/src/lib/host.ts:365](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L365)

___

### getSequenceInstances

▸ **getSequenceInstances**(`sequenceId`): `any`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequenceId` | `string` |

#### Returns

`any`[]

#### Defined in

[packages/host/src/lib/host.ts:375](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L375)

___

### getSequences

▸ **getSequences**(): `any`

#### Returns

`any`

#### Defined in

[packages/host/src/lib/host.ts:371](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L371)

___

### handleDeleteSequence

▸ **handleDeleteSequence**(`req`): `Promise`<`Object`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `ParsedMessage` |

#### Returns

`Promise`<`Object`\>

#### Defined in

[packages/host/src/lib/host.ts:225](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L225)

___

### handleNewSequence

▸ **handleNewSequence**(`stream`): `Promise`<{ `error`: `undefined` ; `id`: `string` ; `opStatus`: `undefined` = 422 } \| { `error`: `any` ; `id`: `undefined` ; `opStatus`: `number` = 422 }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `IncomingMessage` |

#### Returns

`Promise`<{ `error`: `undefined` ; `id`: `string` ; `opStatus`: `undefined` = 422 } \| { `error`: `any` ; `id`: `undefined` ; `opStatus`: `number` = 422 }\>

#### Defined in

[packages/host/src/lib/host.ts:253](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L253)

___

### handleStartSequence

▸ **handleStartSequence**(`req`): `Promise`<`undefined` \| { `id`: `undefined` ; `opStatus`: `ReasonPhrases`  } \| { `id`: `string` ; `opStatus`: `undefined` = 422 }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `ParsedMessage` |

#### Returns

`Promise`<`undefined` \| { `id`: `undefined` ; `opStatus`: `ReasonPhrases`  } \| { `id`: `string` ; `opStatus`: `undefined` = 422 }\>

#### Defined in

[packages/host/src/lib/host.ts:276](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L276)

___

### identifyExistingSequences

▸ **identifyExistingSequences**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:233](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L233)

___

### identifySequence

▸ **identifySequence**(`stream`, `id`): `Promise`<`RunnerConfig`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `Readable` |
| `id` | `string` |

#### Returns

`Promise`<`RunnerConfig`\>

#### Defined in

[packages/host/src/lib/host.ts:301](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L301)

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

[packages/host/src/lib/host.ts:198](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L198)

___

### main

▸ **main**(`__namedParameters?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Partial`<`Object`\> |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/host/src/lib/host.ts:80](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L80)

___

### startCSIController

▸ **startCSIController**(`sequence`, `appConfig`, `sequenceArgs?`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequence` | [`Sequence`](sequence.Sequence.md) |
| `appConfig` | `AppConfig` |
| `sequenceArgs?` | `any`[] |

#### Returns

`Promise`<`string`\>

#### Defined in

[packages/host/src/lib/host.ts:324](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/HEAD/packages/host/src/lib/host.ts#L324)
