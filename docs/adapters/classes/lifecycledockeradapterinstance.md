[@scramjet/adapters](../README.md) / LifecycleDockerAdapterInstance

# Class: LifecycleDockerAdapterInstance

## Hierarchy

* **LifecycleDockerAdapterInstance**

## Implements

* *ILifeCycleAdapterMain*
* *ILifeCycleAdapterRun*
* *IComponent*

## Table of contents

### Constructors

- [constructor](lifecycledockeradapterinstance.md#constructor)

### Properties

- [controlFifoPath](lifecycledockeradapterinstance.md#controlfifopath)
- [controlStream](lifecycledockeradapterinstance.md#controlstream)
- [dockerHelper](lifecycledockeradapterinstance.md#dockerhelper)
- [imageConfig](lifecycledockeradapterinstance.md#imageconfig)
- [inputFifoPath](lifecycledockeradapterinstance.md#inputfifopath)
- [inputStream](lifecycledockeradapterinstance.md#inputstream)
- [logger](lifecycledockeradapterinstance.md#logger)
- [loggerFifoPath](lifecycledockeradapterinstance.md#loggerfifopath)
- [loggerStream](lifecycledockeradapterinstance.md#loggerstream)
- [monitorFifoPath](lifecycledockeradapterinstance.md#monitorfifopath)
- [monitorStream](lifecycledockeradapterinstance.md#monitorstream)
- [outputFifoPath](lifecycledockeradapterinstance.md#outputfifopath)
- [outputStream](lifecycledockeradapterinstance.md#outputstream)
- [resources](lifecycledockeradapterinstance.md#resources)
- [runnerStderr](lifecycledockeradapterinstance.md#runnerstderr)
- [runnerStdin](lifecycledockeradapterinstance.md#runnerstdin)
- [runnerStdout](lifecycledockeradapterinstance.md#runnerstdout)

### Methods

- [cleanup](lifecycledockeradapterinstance.md#cleanup)
- [createFifo](lifecycledockeradapterinstance.md#createfifo)
- [createFifoStreams](lifecycledockeradapterinstance.md#createfifostreams)
- [hookCommunicationHandler](lifecycledockeradapterinstance.md#hookcommunicationhandler)
- [init](lifecycledockeradapterinstance.md#init)
- [monitorRate](lifecycledockeradapterinstance.md#monitorrate)
- [remove](lifecycledockeradapterinstance.md#remove)
- [run](lifecycledockeradapterinstance.md#run)
- [snapshot](lifecycledockeradapterinstance.md#snapshot)
- [stats](lifecycledockeradapterinstance.md#stats)

## Constructors

### constructor

\+ **new LifecycleDockerAdapterInstance**(): [*LifecycleDockerAdapterInstance*](lifecycledockeradapterinstance.md)

**Returns:** [*LifecycleDockerAdapterInstance*](lifecycledockeradapterinstance.md)

Defined in: [instance-adapter.ts:52](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L52)

## Properties

### controlFifoPath

• `Private` `Optional` **controlFifoPath**: *undefined* \| *string*

Defined in: [instance-adapter.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L31)

___

### controlStream

• `Private` **controlStream**: *DelayedStream*

Defined in: [instance-adapter.ts:45](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L45)

___

### dockerHelper

• `Private` **dockerHelper**: [*IDockerHelper*](../interfaces/idockerhelper.md)

Defined in: [instance-adapter.ts:28](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L28)

___

### imageConfig

• `Private` **imageConfig**: { `prerunner?`: *undefined* \| *string* ; `runner?`: *undefined* \| *string*  }

#### Type declaration:

Name | Type |
------ | ------ |
`prerunner?` | *undefined* \| *string* |
`runner?` | *undefined* \| *string* |

Defined in: [instance-adapter.ts:36](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L36)

___

### inputFifoPath

• `Private` `Optional` **inputFifoPath**: *undefined* \| *string*

Defined in: [instance-adapter.ts:32](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L32)

___

### inputStream

• `Private` **inputStream**: *DelayedStream*

Defined in: [instance-adapter.ts:47](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L47)

___

### logger

• **logger**: Console

Defined in: [instance-adapter.ts:52](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L52)

___

### loggerFifoPath

• `Private` `Optional` **loggerFifoPath**: *undefined* \| *string*

Defined in: [instance-adapter.ts:34](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L34)

___

### loggerStream

• `Private` **loggerStream**: *DelayedStream*

Defined in: [instance-adapter.ts:46](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L46)

___

### monitorFifoPath

• `Private` `Optional` **monitorFifoPath**: *undefined* \| *string*

Defined in: [instance-adapter.ts:30](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L30)

___

### monitorStream

• `Private` **monitorStream**: *DelayedStream*

Defined in: [instance-adapter.ts:44](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L44)

___

### outputFifoPath

• `Private` `Optional` **outputFifoPath**: *undefined* \| *string*

Defined in: [instance-adapter.ts:33](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L33)

___

### outputStream

• `Private` **outputStream**: *DelayedStream*

Defined in: [instance-adapter.ts:48](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L48)

___

### resources

• `Private` **resources**: [*DockerAdapterResources*](../README.md#dockeradapterresources)

Defined in: [instance-adapter.ts:50](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L50)

___

### runnerStderr

• `Private` **runnerStderr**: *PassThrough*

Defined in: [instance-adapter.ts:43](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L43)

___

### runnerStdin

• `Private` **runnerStdin**: *PassThrough*

Defined in: [instance-adapter.ts:41](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L41)

___

### runnerStdout

• `Private` **runnerStdout**: *PassThrough*

Defined in: [instance-adapter.ts:42](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L42)

## Methods

### cleanup

▸ **cleanup**(): *MaybePromise*<*void*\>

**Returns:** *MaybePromise*<*void*\>

Defined in: [instance-adapter.ts:238](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L238)

___

### createFifo

▸ `Private`**createFifo**(`dir`: *string*, `fifoName`: *string*): *Promise*<*string*\>

#### Parameters:

Name | Type |
------ | ------ |
`dir` | *string* |
`fifoName` | *string* |

**Returns:** *Promise*<*string*\>

Defined in: [instance-adapter.ts:73](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L73)

___

### createFifoStreams

▸ `Private`**createFifoStreams**(`controlFifo`: *string*, `monitorFifo`: *string*, `loggerFifo`: *string*, `inputFifo`: *string*, `outputFifo`: *string*): *Promise*<*string*\>

#### Parameters:

Name | Type |
------ | ------ |
`controlFifo` | *string* |
`monitorFifo` | *string* |
`loggerFifo` | *string* |
`inputFifo` | *string* |
`outputFifo` | *string* |

**Returns:** *Promise*<*string*\>

Defined in: [instance-adapter.ts:90](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L90)

___

### hookCommunicationHandler

▸ **hookCommunicationHandler**(`communicationHandler`: *ICommunicationHandler*): *void*

#### Parameters:

Name | Type |
------ | ------ |
`communicationHandler` | *ICommunicationHandler* |

**Returns:** *void*

Defined in: [instance-adapter.ts:151](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L151)

___

### init

▸ **init**(): *Promise*<*void*\>

**Returns:** *Promise*<*void*\>

Defined in: [instance-adapter.ts:69](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L69)

___

### monitorRate

▸ **monitorRate**(`rps`: *number*): [*LifecycleDockerAdapterInstance*](lifecycledockeradapterinstance.md)

#### Parameters:

Name | Type |
------ | ------ |
`rps` | *number* |

**Returns:** [*LifecycleDockerAdapterInstance*](lifecycledockeradapterinstance.md)

Defined in: [instance-adapter.ts:267](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L267)

___

### remove

▸ **remove**(): *Promise*<*void*\>

**Returns:** *Promise*<*void*\>

Defined in: [instance-adapter.ts:272](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L272)

___

### run

▸ **run**(`config`: RunnerConfig): *Promise*<*number*\>

#### Parameters:

Name | Type |
------ | ------ |
`config` | RunnerConfig |

**Returns:** *Promise*<*number*\>

Defined in: [instance-adapter.ts:166](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L166)

___

### snapshot

▸ **snapshot**(): *MaybePromise*<*string*\>

**Returns:** *MaybePromise*<*string*\>

Defined in: [instance-adapter.ts:262](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L262)

___

### stats

▸ **stats**(`msg`: MonitoringMessageData): *Promise*<MonitoringMessageData\>

#### Parameters:

Name | Type |
------ | ------ |
`msg` | MonitoringMessageData |

**Returns:** *Promise*<MonitoringMessageData\>

Defined in: [instance-adapter.ts:130](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/adapters/src/instance-adapter.ts#L130)
