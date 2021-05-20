[@scramjet/adapters](../README.md) / LifecycleDockerAdapterSequence

# Class: LifecycleDockerAdapterSequence

## Hierarchy

* **LifecycleDockerAdapterSequence**

## Implements

* *ILifeCycleAdapterMain*
* *ILifeCycleAdapterIdentify*
* *IComponent*

## Table of contents

### Constructors

- [constructor](lifecycledockeradaptersequence.md#constructor)

### Properties

- [dockerHelper](lifecycledockeradaptersequence.md#dockerhelper)
- [imageConfig](lifecycledockeradaptersequence.md#imageconfig)
- [logger](lifecycledockeradaptersequence.md#logger)
- [resources](lifecycledockeradaptersequence.md#resources)

### Methods

- [cleanup](lifecycledockeradaptersequence.md#cleanup)
- [identify](lifecycledockeradaptersequence.md#identify)
- [init](lifecycledockeradaptersequence.md#init)
- [remove](lifecycledockeradaptersequence.md#remove)

## Constructors

### constructor

\+ **new LifecycleDockerAdapterSequence**(): [*LifecycleDockerAdapterSequence*](lifecycledockeradaptersequence.md)

**Returns:** [*LifecycleDockerAdapterSequence*](lifecycledockeradaptersequence.md)

Defined in: [sequence-adapter.ts:30](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/sequence-adapter.ts#L30)

## Properties

### dockerHelper

• `Private` **dockerHelper**: [*IDockerHelper*](../interfaces/idockerhelper.md)

Defined in: [sequence-adapter.ts:21](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/sequence-adapter.ts#L21)

___

### imageConfig

• `Private` **imageConfig**: { `prerunner?`: *undefined* \| *string* ; `runner?`: *undefined* \| *string*  }

#### Type declaration:

Name | Type |
------ | ------ |
`prerunner?` | *undefined* \| *string* |
`runner?` | *undefined* \| *string* |

Defined in: [sequence-adapter.ts:23](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/sequence-adapter.ts#L23)

___

### logger

• **logger**: Console

Defined in: [sequence-adapter.ts:30](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/sequence-adapter.ts#L30)

___

### resources

• `Private` **resources**: [*DockerAdapterResources*](../README.md#dockeradapterresources)

Defined in: [sequence-adapter.ts:28](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/sequence-adapter.ts#L28)

## Methods

### cleanup

▸ **cleanup**(): *MaybePromise*<*void*\>

**Returns:** *MaybePromise*<*void*\>

Defined in: [sequence-adapter.ts:113](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/sequence-adapter.ts#L113)

___

### identify

▸ **identify**(`stream`: *Readable*): *MaybePromise*<RunnerConfig\>

#### Parameters:

Name | Type |
------ | ------ |
`stream` | *Readable* |

**Returns:** *MaybePromise*<RunnerConfig\>

Defined in: [sequence-adapter.ts:42](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/sequence-adapter.ts#L42)

___

### init

▸ **init**(): *Promise*<*void*\>

**Returns:** *Promise*<*void*\>

Defined in: [sequence-adapter.ts:38](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/sequence-adapter.ts#L38)

___

### remove

▸ **remove**(): *Promise*<*void*\>

**Returns:** *Promise*<*void*\>

Defined in: [sequence-adapter.ts:136](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/sequence-adapter.ts#L136)
