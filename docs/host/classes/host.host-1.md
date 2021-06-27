[@scramjet/host](../README.md) / [host](../modules/host.md) / Host

# Class: Host

[host](../modules/host.md).Host

## Implements

- *IComponent*

## Table of contents

### Constructors

- [constructor](host.host-1.md#constructor)

### Properties

- [api](host.host-1.md#api)
- [apiBase](host.host-1.md#apibase)
- [config](host.host-1.md#config)
- [instanceBase](host.host-1.md#instancebase)
- [instancesStore](host.host-1.md#instancesstore)
- [logger](host.host-1.md#logger)
- [sequencesStore](host.host-1.md#sequencesstore)
- [socketServer](host.host-1.md#socketserver)

### Methods

- [attachHostAPIs](host.host-1.md#attachhostapis)
- [getCSIControllers](host.host-1.md#getcsicontrollers)
- [getSequence](host.host-1.md#getsequence)
- [getSequenceInstances](host.host-1.md#getsequenceinstances)
- [getSequences](host.host-1.md#getsequences)
- [handleDeleteSequence](host.host-1.md#handledeletesequence)
- [handleNewSequence](host.host-1.md#handlenewsequence)
- [handleStartSequence](host.host-1.md#handlestartsequence)
- [identifyExistingSequences](host.host-1.md#identifyexistingsequences)
- [identifySequence](host.host-1.md#identifysequence)
- [instanceMiddleware](host.host-1.md#instancemiddleware)
- [main](host.host-1.md#main)
- [startCSIController](host.host-1.md#startcsicontroller)

## Constructors

### constructor

\+ **new Host**(`apiServer`: APIExpose, `socketServer`: [*SocketServer*](socket_server.socketserver.md)): [*Host*](host.host-1.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `apiServer` | APIExpose |
| `socketServer` | [*SocketServer*](socket_server.socketserver.md) |

**Returns:** [*Host*](host.host-1.md)

Defined in: [packages/host/src/lib/host.ts:51](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L51)

## Properties

### api

• **api**: APIExpose

Defined in: [packages/host/src/lib/host.ts:33](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L33)

___

### apiBase

• **apiBase**: *string*

Defined in: [packages/host/src/lib/host.ts:35](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L35)

___

### config

• **config**: STHConfiguration

Defined in: [packages/host/src/lib/host.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L31)

___

### instanceBase

• **instanceBase**: *string*

Defined in: [packages/host/src/lib/host.ts:36](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L36)

___

### instancesStore

• **instancesStore**: *object*

#### Type declaration

Defined in: [packages/host/src/lib/host.ts:40](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L40)

___

### logger

• **logger**: Console

Implementation of: IComponent.logger

Defined in: [packages/host/src/lib/host.ts:43](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L43)

___

### sequencesStore

• **sequencesStore**: [*SequenceStore*](sequence_store.sequencestore.md)

Defined in: [packages/host/src/lib/host.ts:41](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L41)

___

### socketServer

• **socketServer**: [*SocketServer*](socket_server.socketserver.md)

Defined in: [packages/host/src/lib/host.ts:38](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L38)

## Methods

### attachHostAPIs

▸ **attachHostAPIs**(): *void*

Setting up handlers for general Host API endpoints:
- creating Sequence (passing stream with the compressed package)
- starting Instance (based on a given Sequence ID passed in the HTTP request body)
- getting sequence details
- listing all instances running on the CSH
- listing all sequences saved on the CSH
- intance

**Returns:** *void*

Defined in: [packages/host/src/lib/host.ts:112](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L112)

___

### getCSIControllers

▸ **getCSIControllers**(): { `id`: *string* ; `sequence`: [*Sequence*](sequence.sequence-1.md) ; `status`: *undefined* \| FunctionDefinition[]  }[]

**Returns:** { `id`: *string* ; `sequence`: [*Sequence*](sequence.sequence-1.md) ; `status`: *undefined* \| FunctionDefinition[]  }[]

Defined in: [packages/host/src/lib/host.ts:289](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L289)

___

### getSequence

▸ **getSequence**(`id`: *string*): ISequence

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | *string* |

**Returns:** ISequence

Defined in: [packages/host/src/lib/host.ts:301](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L301)

___

### getSequenceInstances

▸ **getSequenceInstances**(`sequenceId`: *string*): *any*[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequenceId` | *string* |

**Returns:** *any*[]

Defined in: [packages/host/src/lib/host.ts:309](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L309)

___

### getSequences

▸ **getSequences**(): *any*

**Returns:** *any*

Defined in: [packages/host/src/lib/host.ts:305](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L305)

___

### handleDeleteSequence

▸ **handleDeleteSequence**(`req`: ParsedMessage): *Promise*<{ `opStatus`: ReasonPhrases  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | ParsedMessage |

**Returns:** *Promise*<{ `opStatus`: ReasonPhrases  }\>

Defined in: [packages/host/src/lib/host.ts:159](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L159)

___

### handleNewSequence

▸ **handleNewSequence**(`stream`: *IncomingMessage*): *Promise*<{ `error`: *undefined* ; `id`: *string* ; `opStatus`: *undefined* = 422 } \| { `error`: *any* ; `id`: *undefined* ; `opStatus`: *number* = 422 }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | *IncomingMessage* |

**Returns:** *Promise*<{ `error`: *undefined* ; `id`: *string* ; `opStatus`: *undefined* = 422 } \| { `error`: *any* ; `id`: *undefined* ; `opStatus`: *number* = 422 }\>

Defined in: [packages/host/src/lib/host.ts:189](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L189)

___

### handleStartSequence

▸ **handleStartSequence**(`req`: ParsedMessage): *Promise*<undefined \| { `id`: *undefined* ; `opStatus`: ReasonPhrases  } \| { `id`: *string* ; `opStatus`: *undefined* = 422 }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | ParsedMessage |

**Returns:** *Promise*<undefined \| { `id`: *undefined* ; `opStatus`: ReasonPhrases  } \| { `id`: *string* ; `opStatus`: *undefined* = 422 }\>

Defined in: [packages/host/src/lib/host.ts:212](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L212)

___

### identifyExistingSequences

▸ **identifyExistingSequences**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Defined in: [packages/host/src/lib/host.ts:169](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L169)

___

### identifySequence

▸ **identifySequence**(`stream`: *Readable*, `id`: *string*): *Promise*<RunnerConfig\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | *Readable* |
| `id` | *string* |

**Returns:** *Promise*<RunnerConfig\>

Defined in: [packages/host/src/lib/host.ts:237](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L237)

___

### instanceMiddleware

▸ **instanceMiddleware**(`req`: ParsedMessage, `res`: *ServerResponse*, `next`: NextCallback): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | ParsedMessage |
| `res` | *ServerResponse* |
| `next` | NextCallback |

**Returns:** *void*

Defined in: [packages/host/src/lib/host.ts:132](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L132)

___

### main

▸ **main**(`__namedParameters?`: *Partial*<{ `identifyExisting`: *boolean*  }\>): *Promise*<void\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `__namedParameters` | *Partial*<{ `identifyExisting`: *boolean*  }\> | {} |

**Returns:** *Promise*<void\>

Defined in: [packages/host/src/lib/host.ts:69](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L69)

___

### startCSIController

▸ **startCSIController**(`sequence`: [*Sequence*](sequence.sequence-1.md), `appConfig`: AppConfig, `sequenceArgs?`: *any*[]): *Promise*<string\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sequence` | [*Sequence*](sequence.sequence-1.md) |
| `appConfig` | AppConfig |
| `sequenceArgs?` | *any*[] |

**Returns:** *Promise*<string\>

Defined in: [packages/host/src/lib/host.ts:260](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/host/src/lib/host.ts#L260)
