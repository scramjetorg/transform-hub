[@scramjet/supervisor](../README.md) / LifecycleDockerAdapter

# Class: LifecycleDockerAdapter

## Hierarchy

* **LifecycleDockerAdapter**

## Implements

* *ILifeCycleAdapter*
* *IComponent*

## Table of contents

### Constructors

- [constructor](lifecycledockeradapter.md#constructor)

### Properties

- [controlFifoPath](lifecycledockeradapter.md#controlfifopath)
- [controlStream](lifecycledockeradapter.md#controlstream)
- [dockerHelper](lifecycledockeradapter.md#dockerhelper)
- [imageConfig](lifecycledockeradapter.md#imageconfig)
- [inputFifoPath](lifecycledockeradapter.md#inputfifopath)
- [inputStream](lifecycledockeradapter.md#inputstream)
- [logger](lifecycledockeradapter.md#logger)
- [loggerFifoPath](lifecycledockeradapter.md#loggerfifopath)
- [loggerStream](lifecycledockeradapter.md#loggerstream)
- [monitorFifoPath](lifecycledockeradapter.md#monitorfifopath)
- [monitorStream](lifecycledockeradapter.md#monitorstream)
- [outputFifoPath](lifecycledockeradapter.md#outputfifopath)
- [outputStream](lifecycledockeradapter.md#outputstream)
- [resources](lifecycledockeradapter.md#resources)
- [runnerStderr](lifecycledockeradapter.md#runnerstderr)
- [runnerStdin](lifecycledockeradapter.md#runnerstdin)
- [runnerStdout](lifecycledockeradapter.md#runnerstdout)

### Methods

- [cleanup](lifecycledockeradapter.md#cleanup)
- [createFifo](lifecycledockeradapter.md#createfifo)
- [createFifoStreams](lifecycledockeradapter.md#createfifostreams)
- [hookCommunicationHandler](lifecycledockeradapter.md#hookcommunicationhandler)
- [identify](lifecycledockeradapter.md#identify)
- [init](lifecycledockeradapter.md#init)
- [monitorRate](lifecycledockeradapter.md#monitorrate)
- [remove](lifecycledockeradapter.md#remove)
- [run](lifecycledockeradapter.md#run)
- [snapshot](lifecycledockeradapter.md#snapshot)
- [stats](lifecycledockeradapter.md#stats)
- [stop](lifecycledockeradapter.md#stop)

## Constructors

### constructor

\+ **new LifecycleDockerAdapter**(): [*LifecycleDockerAdapter*](lifecycledockeradapter.md)

**Returns:** [*LifecycleDockerAdapter*](lifecycledockeradapter.md)

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:52](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L52)

## Properties

### controlFifoPath

• `Private` `Optional` **controlFifoPath**: *undefined* \| *string*

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:31](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L31)

___

### controlStream

• `Private` **controlStream**: *DelayedStream*

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:45](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L45)

___

### dockerHelper

• `Private` **dockerHelper**: IDockerHelper

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:28](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L28)

___

### imageConfig

• `Private` **imageConfig**: { `prerunner?`: *undefined* \| *string* ; `runner?`: *undefined* \| *string*  }

#### Type declaration:

Name | Type |
------ | ------ |
`prerunner?` | *undefined* \| *string* |
`runner?` | *undefined* \| *string* |

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:36](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L36)

___

### inputFifoPath

• `Private` `Optional` **inputFifoPath**: *undefined* \| *string*

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:32](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L32)

___

### inputStream

• `Private` **inputStream**: *DelayedStream*

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:47](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L47)

___

### logger

• **logger**: Console

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:52](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L52)

___

### loggerFifoPath

• `Private` `Optional` **loggerFifoPath**: *undefined* \| *string*

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:34](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L34)

___

### loggerStream

• `Private` **loggerStream**: *DelayedStream*

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:46](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L46)

___

### monitorFifoPath

• `Private` `Optional` **monitorFifoPath**: *undefined* \| *string*

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:30](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L30)

___

### monitorStream

• `Private` **monitorStream**: *DelayedStream*

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:44](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L44)

___

### outputFifoPath

• `Private` `Optional` **outputFifoPath**: *undefined* \| *string*

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:33](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L33)

___

### outputStream

• `Private` **outputStream**: *DelayedStream*

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:48](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L48)

___

### resources

• `Private` **resources**: DockerAdapterResources

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:50](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L50)

___

### runnerStderr

• `Private` **runnerStderr**: *PassThrough*

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:43](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L43)

___

### runnerStdin

• `Private` **runnerStdin**: *PassThrough*

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:41](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L41)

___

### runnerStdout

• `Private` **runnerStdout**: *PassThrough*

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:42](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L42)

## Methods

### cleanup

▸ **cleanup**(): *MaybePromise*<*void*\>

**Returns:** *MaybePromise*<*void*\>

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:314](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L314)

___

### createFifo

▸ `Private`**createFifo**(`dir`: *string*, `fifoName`: *string*): *Promise*<*string*\>

#### Parameters:

Name | Type |
------ | ------ |
`dir` | *string* |
`fifoName` | *string* |

**Returns:** *Promise*<*string*\>

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:73](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L73)

___

### createFifoStreams

▸ `Private`**createFifoStreams**(`controlFifo`: *string*, `monitorFifo`: *string*, `loggerFifo`: *string*, `inputFifo`: *string*, `outputFifo`: *string*): *Promise*<*string*\>

**`analyze-how-to-pass-in-out-streams`** 
Additional two fifo files need to be be created:
input.fifo - input stream to the Sequence
output.fifo - output stream for a Sequence

#### Parameters:

Name | Type |
------ | ------ |
`controlFifo` | *string* |
`monitorFifo` | *string* |
`loggerFifo` | *string* |
`inputFifo` | *string* |
`outputFifo` | *string* |

**Returns:** *Promise*<*string*\>

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:96](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L96)

___

### hookCommunicationHandler

▸ **hookCommunicationHandler**(`communicationHandler`: *ICommunicationHandler*): *void*

#### Parameters:

Name | Type |
------ | ------ |
`communicationHandler` | *ICommunicationHandler* |

**Returns:** *void*

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:227](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L227)

___

### identify

▸ **identify**(`stream`: *Readable*): *MaybePromise*<RunnerConfig\>

#### Parameters:

Name | Type |
------ | ------ |
`stream` | *Readable* |

**Returns:** *MaybePromise*<RunnerConfig\>

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:156](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L156)

___

### init

▸ **init**(): *Promise*<*void*\>

**Returns:** *Promise*<*void*\>

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:69](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L69)

___

### monitorRate

▸ **monitorRate**(`rps`: *number*): [*LifecycleDockerAdapter*](lifecycledockeradapter.md)

#### Parameters:

Name | Type |
------ | ------ |
`rps` | *number* |

**Returns:** [*LifecycleDockerAdapter*](lifecycledockeradapter.md)

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:343](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L343)

___

### remove

▸ **remove**(): *Promise*<*void*\>

**Returns:** *Promise*<*void*\>

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:365](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L365)

___

### run

▸ **run**(`config`: RunnerConfig): *Promise*<*number*\>

#### Parameters:

Name | Type |
------ | ------ |
`config` | RunnerConfig |

**Returns:** *Promise*<*number*\>

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:242](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L242)

___

### snapshot

▸ **snapshot**(): *MaybePromise*<*string*\>

**Returns:** *MaybePromise*<*string*\>

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:338](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L338)

___

### stats

▸ **stats**(`msg`: MonitoringMessageData): *Promise*<MonitoringMessageData\>

#### Parameters:

Name | Type |
------ | ------ |
`msg` | MonitoringMessageData |

**Returns:** *Promise*<MonitoringMessageData\>

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:136](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L136)

___

### stop

▸ **stop**(): *MaybePromise*<*void*\>

**Returns:** *MaybePromise*<*void*\>

Defined in: [lib/adapters/docker/lifecycle-docker-adapter.ts:349](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/28f9eb4/packages/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter.ts#L349)
