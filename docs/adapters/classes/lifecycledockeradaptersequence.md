[@scramjet/adapters](../README.md) / LifecycleDockerAdapterSequence

# Class: LifecycleDockerAdapterSequence

## Implements

- *ILifeCycleAdapterMain*
- *ILifeCycleAdapterIdentify*
- *IComponent*

## Table of contents

### Constructors

- [constructor](lifecycledockeradaptersequence.md#constructor)

### Properties

- [dockerHelper](lifecycledockeradaptersequence.md#dockerhelper)
- [logger](lifecycledockeradaptersequence.md#logger)
- [prerunnerConfig](lifecycledockeradaptersequence.md#prerunnerconfig)
- [resources](lifecycledockeradaptersequence.md#resources)

### Methods

- [cleanup](lifecycledockeradaptersequence.md#cleanup)
- [createVolume](lifecycledockeradaptersequence.md#createvolume)
- [fetch](lifecycledockeradaptersequence.md#fetch)
- [identify](lifecycledockeradaptersequence.md#identify)
- [identifyOnly](lifecycledockeradaptersequence.md#identifyonly)
- [init](lifecycledockeradaptersequence.md#init)
- [list](lifecycledockeradaptersequence.md#list)
- [parsePackage](lifecycledockeradaptersequence.md#parsepackage)
- [readStreamedJSON](lifecycledockeradaptersequence.md#readstreamedjson)
- [remove](lifecycledockeradaptersequence.md#remove)

## Constructors

### constructor

\+ **new LifecycleDockerAdapterSequence**(): [*LifecycleDockerAdapterSequence*](lifecycledockeradaptersequence.md)

**Returns:** [*LifecycleDockerAdapterSequence*](lifecycledockeradaptersequence.md)

Defined in: [sequence-adapter.ts:30](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/sequence-adapter.ts#L30)

## Properties

### dockerHelper

• `Private` **dockerHelper**: [*IDockerHelper*](../interfaces/idockerhelper.md)

Defined in: [sequence-adapter.ts:24](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/sequence-adapter.ts#L24)

___

### logger

• **logger**: Console

Implementation of: IComponent.logger

Defined in: [sequence-adapter.ts:30](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/sequence-adapter.ts#L30)

___

### prerunnerConfig

• `Private` `Optional` **prerunnerConfig**: ContainerConfiguration

Defined in: [sequence-adapter.ts:26](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/sequence-adapter.ts#L26)

___

### resources

• `Private` **resources**: [*DockerAdapterResources*](../README.md#dockeradapterresources)= {}

Defined in: [sequence-adapter.ts:28](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/sequence-adapter.ts#L28)

## Methods

### cleanup

▸ **cleanup**(): *MaybePromise*<void\>

**Returns:** *MaybePromise*<void\>

Implementation of: ILifeCycleAdapterMain.cleanup

Defined in: [sequence-adapter.ts:169](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/sequence-adapter.ts#L169)

___

### createVolume

▸ `Private` **createVolume**(`id`: *string*): *Promise*<string\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | *string* |

**Returns:** *Promise*<string\>

Defined in: [sequence-adapter.ts:137](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/sequence-adapter.ts#L137)

___

### fetch

▸ **fetch**(`name`: *string*): *Promise*<void\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | *string* |

**Returns:** *Promise*<void\>

Defined in: [sequence-adapter.ts:44](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/sequence-adapter.ts#L44)

___

### identify

▸ **identify**(`stream`: *Readable*, `id`: *string*): *Promise*<RunnerConfig\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | *Readable* |
| `id` | *string* |

**Returns:** *Promise*<RunnerConfig\>

Implementation of: ILifeCycleAdapterIdentify.identify

Defined in: [sequence-adapter.ts:103](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/sequence-adapter.ts#L103)

___

### identifyOnly

▸ **identifyOnly**(`volume`: *string*): *Promise*<undefined \| RunnerConfig\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `volume` | *string* |

**Returns:** *Promise*<undefined \| RunnerConfig\>

Defined in: [sequence-adapter.ts:58](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/sequence-adapter.ts#L58)

___

### init

▸ **init**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Implementation of: ILifeCycleAdapterMain.init

Defined in: [sequence-adapter.ts:37](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/sequence-adapter.ts#L37)

___

### list

▸ **list**(): *Promise*<RunnerConfig[]\>

**Returns:** *Promise*<RunnerConfig[]\>

Implementation of: ILifeCycleAdapterIdentify.list

Defined in: [sequence-adapter.ts:48](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/sequence-adapter.ts#L48)

___

### parsePackage

▸ `Private` **parsePackage**(`streams`: [*DockerAdapterStreams*](../README.md#dockeradapterstreams), `wait`: Function, `volumeId`: *string*): *Promise*<any\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `streams` | [*DockerAdapterStreams*](../README.md#dockeradapterstreams) |
| `wait` | Function |
| `volumeId` | *string* |

**Returns:** *Promise*<any\>

Defined in: [sequence-adapter.ts:145](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/sequence-adapter.ts#L145)

___

### readStreamedJSON

▸ `Private` **readStreamedJSON**(`readable`: *Readable*): *Promise*<any\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `readable` | *Readable* |

**Returns:** *Promise*<any\>

Defined in: [sequence-adapter.ts:89](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/sequence-adapter.ts#L89)

___

### remove

▸ **remove**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Implementation of: ILifeCycleAdapterMain.remove

Defined in: [sequence-adapter.ts:192](https://github.com/scramjetorg/transform-hub/blob/8f44413a/packages/adapters/src/sequence-adapter.ts#L192)
