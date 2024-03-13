[@scramjet/adapters](../README.md) / [Exports](../modules.md) / KubernetesInstanceAdapter

# Class: KubernetesInstanceAdapter

Adapter for running Instance by Runner executed in separate process.

## Implements

- `ILifeCycleAdapterMain`
- `ILifeCycleAdapterRun`
- `IComponent`

## Table of contents

### Properties

- [\_kubeClient](KubernetesInstanceAdapter.md#_kubeclient)
- [\_limits](KubernetesInstanceAdapter.md#_limits)
- [\_runnerName](KubernetesInstanceAdapter.md#_runnername)
- [adapterConfig](KubernetesInstanceAdapter.md#adapterconfig)
- [logger](KubernetesInstanceAdapter.md#logger)
- [name](KubernetesInstanceAdapter.md#name)
- [stdErrorStream](KubernetesInstanceAdapter.md#stderrorstream)
- [sthConfig](KubernetesInstanceAdapter.md#sthconfig)

### Methods

- [cleanup](KubernetesInstanceAdapter.md#cleanup)
- [dispatch](KubernetesInstanceAdapter.md#dispatch)
- [getCrashLog](KubernetesInstanceAdapter.md#getcrashlog)
- [init](KubernetesInstanceAdapter.md#init)
- [monitorRate](KubernetesInstanceAdapter.md#monitorrate)
- [remove](KubernetesInstanceAdapter.md#remove)
- [run](KubernetesInstanceAdapter.md#run)
- [stats](KubernetesInstanceAdapter.md#stats)
- [timeout](KubernetesInstanceAdapter.md#timeout)
- [waitUntilExit](KubernetesInstanceAdapter.md#waituntilexit)

### Constructors

- [constructor](KubernetesInstanceAdapter.md#constructor)

### Accessors

- [kubeClient](KubernetesInstanceAdapter.md#kubeclient)
- [limits](KubernetesInstanceAdapter.md#limits)
- [runnerResourcesConfig](KubernetesInstanceAdapter.md#runnerresourcesconfig)

## Properties

### \_kubeClient

• `Private` `Optional` **\_kubeClient**: `KubernetesClientAdapter`

#### Defined in

[kubernetes-instance-adapter.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L38)

___

### \_limits

• `Private` `Optional` **\_limits**: `InstanceLimits` = `{}`

#### Defined in

[kubernetes-instance-adapter.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L41)

___

### \_runnerName

• `Private` `Optional` **\_runnerName**: `string`

#### Defined in

[kubernetes-instance-adapter.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L37)

___

### adapterConfig

• `Private` **adapterConfig**: `K8SAdapterConfiguration`

#### Defined in

[kubernetes-instance-adapter.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L40)

___

### logger

• **logger**: `IObjectLogger`

#### Implementation of

ILifeCycleAdapterMain.logger

#### Defined in

[kubernetes-instance-adapter.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L33)

___

### name

• **name**: `string` = `"KubernetesInstanceAdapter"`

#### Defined in

[kubernetes-instance-adapter.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L34)

___

### stdErrorStream

• `Optional` **stdErrorStream**: `PassThrough`

#### Defined in

[kubernetes-instance-adapter.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L43)

___

### sthConfig

• `Private` **sthConfig**: `STHConfiguration`

#### Defined in

[kubernetes-instance-adapter.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L36)

## Methods

### cleanup

▸ **cleanup**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.cleanup

#### Defined in

[kubernetes-instance-adapter.ts:212](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L212)

___

### dispatch

▸ **dispatch**(`config`, `instancesServerPort`, `instanceId`, `sequenceInfo`, `payload`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `InstanceConfig` |
| `instancesServerPort` | `number` |
| `instanceId` | `string` |
| `sequenceInfo` | `SequenceInfo` |
| `payload` | `RunnerConnectInfo` |

#### Returns

`Promise`<`number`\>

#### Implementation of

ILifeCycleAdapterRun.dispatch

#### Defined in

[kubernetes-instance-adapter.ts:98](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L98)

___

### getCrashLog

▸ **getCrashLog**(): `Promise`<`string`[]\>

#### Returns

`Promise`<`string`[]\>

#### Implementation of

ILifeCycleAdapterMain.getCrashLog

#### Defined in

[kubernetes-instance-adapter.ts:240](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L240)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.init

#### Defined in

[kubernetes-instance-adapter.ts:72](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L72)

___

### monitorRate

▸ **monitorRate**(`_rps`): [`KubernetesInstanceAdapter`](KubernetesInstanceAdapter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_rps` | `number` |

#### Returns

[`KubernetesInstanceAdapter`](KubernetesInstanceAdapter.md)

#### Implementation of

ILifeCycleAdapterMain.monitorRate

#### Defined in

[kubernetes-instance-adapter.ts:217](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L217)

___

### remove

▸ **remove**(`ms?`): `Promise`<`void`\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `ms` | `string` | `"0"` |

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.remove

#### Defined in

[kubernetes-instance-adapter.ts:226](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L226)

___

### run

▸ **run**(`config`, `instancesServerPort`, `instanceId`, `sequenceInfo`, `payload`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `InstanceConfig` |
| `instancesServerPort` | `number` |
| `instanceId` | `string` |
| `sequenceInfo` | `SequenceInfo` |
| `payload` | `RunnerConnectInfo` |

#### Returns

`Promise`<`number`\>

#### Implementation of

ILifeCycleAdapterRun.run

#### Defined in

[kubernetes-instance-adapter.ts:207](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L207)

___

### stats

▸ **stats**(`msg`): `Promise`<`MonitoringMessageData`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `MonitoringMessageData` |

#### Returns

`Promise`<`MonitoringMessageData`\>

#### Implementation of

ILifeCycleAdapterMain.stats

#### Defined in

[kubernetes-instance-adapter.ts:79](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L79)

___

### timeout

▸ **timeout**(`ms`): `Promise`<`unknown`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `ms` | `string` |

#### Returns

`Promise`<`unknown`\>

#### Defined in

[kubernetes-instance-adapter.ts:221](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L221)

___

### waitUntilExit

▸ **waitUntilExit**(`_config`, `instanceId`, `_sequenceInfo`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `_config` | `InstanceConfig` |
| `instanceId` | `string` |
| `_sequenceInfo` | `SequenceInfo` |

#### Returns

`Promise`<`number`\>

#### Implementation of

ILifeCycleAdapterMain.waitUntilExit

#### Defined in

[kubernetes-instance-adapter.ts:183](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L183)

## Constructors

### constructor

• **new KubernetesInstanceAdapter**(`sthConfig`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `sthConfig` | `STHConfiguration` |

#### Defined in

[kubernetes-instance-adapter.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L48)

## Accessors

### kubeClient

• `Private` `get` **kubeClient**(): `KubernetesClientAdapter`

#### Returns

`KubernetesClientAdapter`

#### Defined in

[kubernetes-instance-adapter.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L63)

___

### limits

• `get` **limits**(): `InstanceLimits`

#### Returns

`InstanceLimits`

#### Implementation of

ILifeCycleAdapterRun.limits

#### Defined in

[kubernetes-instance-adapter.ts:45](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L45)

• `set` **limits**(`value`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `InstanceLimits` |

#### Returns

`void`

#### Implementation of

ILifeCycleAdapterRun.limits

#### Defined in

[kubernetes-instance-adapter.ts:46](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L46)

___

### runnerResourcesConfig

• `Private` `get` **runnerResourcesConfig**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `limits` | { `cpu`: `string` ; `memory`: `string`  } |
| `limits.cpu` | `string` |
| `limits.memory` | `string` |
| `requests` | { `cpu`: `string` ; `memory`: `string`  } |
| `requests.cpu` | `string` |
| `requests.memory` | `string` |

#### Defined in

[kubernetes-instance-adapter.ts:86](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L86)
