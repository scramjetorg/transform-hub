[@scramjet/adapters](../README.md) / LifecycleDockerAdapterInstance

# Class: LifecycleDockerAdapterInstance

## Implements

- *ILifeCycleAdapterMain*
- *ILifeCycleAdapterRun*
- *IComponent*

## Table of contents

### Constructors

- [constructor](lifecycledockeradapterinstance.md#constructor)

### Properties

- [controlFifoPath](lifecycledockeradapterinstance.md#controlfifopath)
- [controlStream](lifecycledockeradapterinstance.md#controlstream)
- [dockerHelper](lifecycledockeradapterinstance.md#dockerhelper)
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
- [getPortsConfig](lifecycledockeradapterinstance.md#getportsconfig)
- [hookCommunicationHandler](lifecycledockeradapterinstance.md#hookcommunicationhandler)
- [init](lifecycledockeradapterinstance.md#init)
- [monitorRate](lifecycledockeradapterinstance.md#monitorrate)
- [preparePortBindingsConfig](lifecycledockeradapterinstance.md#prepareportbindingsconfig)
- [remove](lifecycledockeradapterinstance.md#remove)
- [run](lifecycledockeradapterinstance.md#run)
- [snapshot](lifecycledockeradapterinstance.md#snapshot)
- [stats](lifecycledockeradapterinstance.md#stats)

## Constructors

### constructor

\+ **new LifecycleDockerAdapterInstance**(): [*LifecycleDockerAdapterInstance*](lifecycledockeradapterinstance.md)

**Returns:** [*LifecycleDockerAdapterInstance*](lifecycledockeradapterinstance.md)

Defined in: [instance-adapter.ts:51](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L51)

## Properties

### controlFifoPath

• `Private` `Optional` **controlFifoPath**: *string*

Defined in: [instance-adapter.ts:35](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L35)

___

### controlStream

• `Private` **controlStream**: *DelayedStream*

Defined in: [instance-adapter.ts:44](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L44)

___

### dockerHelper

• `Private` **dockerHelper**: [*IDockerHelper*](../interfaces/idockerhelper.md)

Defined in: [instance-adapter.ts:32](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L32)

___

### inputFifoPath

• `Private` `Optional` **inputFifoPath**: *string*

Defined in: [instance-adapter.ts:36](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L36)

___

### inputStream

• `Private` **inputStream**: *DelayedStream*

Defined in: [instance-adapter.ts:46](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L46)

___

### logger

• **logger**: Console

Implementation of: IComponent.logger

Defined in: [instance-adapter.ts:51](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L51)

___

### loggerFifoPath

• `Private` `Optional` **loggerFifoPath**: *string*

Defined in: [instance-adapter.ts:38](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L38)

___

### loggerStream

• `Private` **loggerStream**: *DelayedStream*

Defined in: [instance-adapter.ts:45](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L45)

___

### monitorFifoPath

• `Private` `Optional` **monitorFifoPath**: *string*

Defined in: [instance-adapter.ts:34](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L34)

___

### monitorStream

• `Private` **monitorStream**: *DelayedStream*

Defined in: [instance-adapter.ts:43](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L43)

___

### outputFifoPath

• `Private` `Optional` **outputFifoPath**: *string*

Defined in: [instance-adapter.ts:37](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L37)

___

### outputStream

• `Private` **outputStream**: *DelayedStream*

Defined in: [instance-adapter.ts:47](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L47)

___

### resources

• `Private` **resources**: [*DockerAdapterResources*](../README.md#dockeradapterresources)= {}

Defined in: [instance-adapter.ts:49](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L49)

___

### runnerStderr

• `Private` **runnerStderr**: *PassThrough*

Defined in: [instance-adapter.ts:42](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L42)

___

### runnerStdin

• `Private` **runnerStdin**: *PassThrough*

Defined in: [instance-adapter.ts:40](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L40)

___

### runnerStdout

• `Private` **runnerStdout**: *PassThrough*

Defined in: [instance-adapter.ts:41](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L41)

## Methods

### cleanup

▸ **cleanup**(): *MaybePromise*<void\>

**Returns:** *MaybePromise*<void\>

Implementation of: ILifeCycleAdapterMain.cleanup

Defined in: [instance-adapter.ts:309](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L309)

___

### createFifo

▸ `Private` **createFifo**(`dir`: *string*, `fifoName`: *string*): *Promise*<string\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `dir` | *string* |
| `fifoName` | *string* |

**Returns:** *Promise*<string\>

Defined in: [instance-adapter.ts:72](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L72)

___

### createFifoStreams

▸ `Private` **createFifoStreams**(`controlFifo`: *string*, `monitorFifo`: *string*, `loggerFifo`: *string*, `inputFifo`: *string*, `outputFifo`: *string*): *Promise*<string\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `controlFifo` | *string* |
| `monitorFifo` | *string* |
| `loggerFifo` | *string* |
| `inputFifo` | *string* |
| `outputFifo` | *string* |

**Returns:** *Promise*<string\>

Defined in: [instance-adapter.ts:89](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L89)

___

### getPortsConfig

▸ **getPortsConfig**(`ports`: *string*[]): *Promise*<[*DockerAdapterRunPortsConfig*](../README.md#dockeradapterrunportsconfig)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `ports` | *string*[] |

**Returns:** *Promise*<[*DockerAdapterRunPortsConfig*](../README.md#dockeradapterrunportsconfig)\>

Defined in: [instance-adapter.ts:144](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L144)

___

### hookCommunicationHandler

▸ **hookCommunicationHandler**(`communicationHandler`: *ICommunicationHandler*): *void*

#### Parameters

| Name | Type |
| :------ | :------ |
| `communicationHandler` | *ICommunicationHandler* |

**Returns:** *void*

Implementation of: ILifeCycleAdapterRun.hookCommunicationHandler

Defined in: [instance-adapter.ts:174](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L174)

___

### init

▸ **init**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Implementation of: ILifeCycleAdapterMain.init

Defined in: [instance-adapter.ts:68](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L68)

___

### monitorRate

▸ **monitorRate**(`rps`: *number*): [*LifecycleDockerAdapterInstance*](lifecycledockeradapterinstance.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `rps` | *number* |

**Returns:** [*LifecycleDockerAdapterInstance*](lifecycledockeradapterinstance.md)

Implementation of: ILifeCycleAdapterRun.monitorRate

Defined in: [instance-adapter.ts:338](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L338)

___

### preparePortBindingsConfig

▸ `Private` **preparePortBindingsConfig**(`declaredPorts`: *string*[], `exposed?`: *boolean*): *Promise*<{ [key: string]: *any*;  }\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `declaredPorts` | *string*[] | - |
| `exposed` | *boolean* | false |

**Returns:** *Promise*<{ [key: string]: *any*;  }\>

Defined in: [instance-adapter.ts:130](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L130)

___

### remove

▸ **remove**(): *Promise*<void\>

**Returns:** *Promise*<void\>

Implementation of: ILifeCycleAdapterMain.remove

Defined in: [instance-adapter.ts:343](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L343)

___

### run

▸ **run**(`config`: RunnerConfig): *Promise*<number\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | RunnerConfig |

**Returns:** *Promise*<number\>

Implementation of: ILifeCycleAdapterRun.run

Defined in: [instance-adapter.ts:211](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L211)

___

### snapshot

▸ **snapshot**(): *MaybePromise*<string\>

**Returns:** *MaybePromise*<string\>

Implementation of: ILifeCycleAdapterRun.snapshot

Defined in: [instance-adapter.ts:333](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L333)

___

### stats

▸ **stats**(`msg`: MonitoringMessageData): *Promise*<MonitoringMessageData\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | MonitoringMessageData |

**Returns:** *Promise*<MonitoringMessageData\>

Implementation of: ILifeCycleAdapterRun.stats

Defined in: [instance-adapter.ts:153](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/adapters/src/instance-adapter.ts#L153)
