[@scramjet/adapters](../README.md) / LifecycleDockerAdapterSequence

# Class: LifecycleDockerAdapterSequence

## Implements

- `ILifeCycleAdapterMain`
- `ILifeCycleAdapterIdentify`
- `IComponent`

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

• **new LifecycleDockerAdapterSequence**()

#### Defined in

[sequence-adapter.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/adapters/src/sequence-adapter.ts#L31)

## Properties

### dockerHelper

• `Private` **dockerHelper**: [`IDockerHelper`](../interfaces/idockerhelper.md)

#### Defined in

[sequence-adapter.ts:25](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/adapters/src/sequence-adapter.ts#L25)

___

### logger

• **logger**: `Console`

#### Implementation of

IComponent.logger

#### Defined in

[sequence-adapter.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/adapters/src/sequence-adapter.ts#L31)

___

### prerunnerConfig

• `Private` `Optional` **prerunnerConfig**: `ContainerConfiguration`

#### Defined in

[sequence-adapter.ts:27](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/adapters/src/sequence-adapter.ts#L27)

___

### resources

• `Private` **resources**: [`DockerAdapterResources`](../README.md#dockeradapterresources) = `{}`

#### Defined in

[sequence-adapter.ts:29](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/adapters/src/sequence-adapter.ts#L29)

## Methods

### cleanup

▸ **cleanup**(): `MaybePromise`<`void`\>

#### Returns

`MaybePromise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.cleanup

#### Defined in

[sequence-adapter.ts:170](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/adapters/src/sequence-adapter.ts#L170)

___

### createVolume

▸ `Private` **createVolume**(`id`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`Promise`<`string`\>

#### Defined in

[sequence-adapter.ts:138](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/adapters/src/sequence-adapter.ts#L138)

___

### fetch

▸ **fetch**(`name`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[sequence-adapter.ts:45](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/adapters/src/sequence-adapter.ts#L45)

___

### identify

▸ **identify**(`stream`, `id`): `Promise`<`RunnerConfig`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `Readable` |
| `id` | `string` |

#### Returns

`Promise`<`RunnerConfig`\>

#### Implementation of

ILifeCycleAdapterIdentify.identify

#### Defined in

[sequence-adapter.ts:104](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/adapters/src/sequence-adapter.ts#L104)

___

### identifyOnly

▸ **identifyOnly**(`volume`): `Promise`<`undefined` \| `RunnerConfig`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `volume` | `string` |

#### Returns

`Promise`<`undefined` \| `RunnerConfig`\>

#### Defined in

[sequence-adapter.ts:59](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/adapters/src/sequence-adapter.ts#L59)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.init

#### Defined in

[sequence-adapter.ts:38](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/adapters/src/sequence-adapter.ts#L38)

___

### list

▸ **list**(): `Promise`<`RunnerConfig`[]\>

#### Returns

`Promise`<`RunnerConfig`[]\>

#### Implementation of

ILifeCycleAdapterIdentify.list

#### Defined in

[sequence-adapter.ts:49](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/adapters/src/sequence-adapter.ts#L49)

___

### parsePackage

▸ `Private` **parsePackage**(`streams`, `wait`, `volumeId`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `streams` | [`DockerAdapterStreams`](../README.md#dockeradapterstreams) |
| `wait` | `Function` |
| `volumeId` | `string` |

#### Returns

`Promise`<`any`\>

#### Defined in

[sequence-adapter.ts:146](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/adapters/src/sequence-adapter.ts#L146)

___

### readStreamedJSON

▸ `Private` **readStreamedJSON**(`readable`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `readable` | `Readable` |

#### Returns

`Promise`<`any`\>

#### Defined in

[sequence-adapter.ts:90](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/adapters/src/sequence-adapter.ts#L90)

___

### remove

▸ **remove**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.remove

#### Defined in

[sequence-adapter.ts:193](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/adapters/src/sequence-adapter.ts#L193)
