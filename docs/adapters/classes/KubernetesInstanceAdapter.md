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

### Methods

- [cleanup](KubernetesInstanceAdapter.md#cleanup)
- [getCrashLog](KubernetesInstanceAdapter.md#getcrashlog)
- [init](KubernetesInstanceAdapter.md#init)
- [monitorRate](KubernetesInstanceAdapter.md#monitorrate)
- [remove](KubernetesInstanceAdapter.md#remove)
- [run](KubernetesInstanceAdapter.md#run)
- [stats](KubernetesInstanceAdapter.md#stats)
- [timeout](KubernetesInstanceAdapter.md#timeout)

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

[kubernetes-instance-adapter.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L35)

___

### \_limits

• `Private` `Optional` **\_limits**: `InstanceLimits` = `{}`

#### Defined in

[kubernetes-instance-adapter.ts:38](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L38)

___

### \_runnerName

• `Private` `Optional` **\_runnerName**: `string`

#### Defined in

[kubernetes-instance-adapter.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L34)

___

### adapterConfig

• `Private` **adapterConfig**: `K8SAdapterConfiguration`

#### Defined in

[kubernetes-instance-adapter.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L37)

___

### logger

• **logger**: `IObjectLogger`

#### Implementation of

ILifeCycleAdapterMain.logger

#### Defined in

[kubernetes-instance-adapter.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L31)

___

### name

• **name**: `string` = `"KubernetesInstanceAdapter"`

#### Defined in

[kubernetes-instance-adapter.ts:32](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L32)

## Methods

### cleanup

▸ **cleanup**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.cleanup

#### Defined in

[kubernetes-instance-adapter.ts:182](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L182)

___

### getCrashLog

▸ **getCrashLog**(): `Promise`<`string`[]\>

#### Returns

`Promise`<`string`[]\>

#### Implementation of

ILifeCycleAdapterMain.getCrashLog

#### Defined in

[kubernetes-instance-adapter.ts:207](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L207)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.init

#### Defined in

[kubernetes-instance-adapter.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L64)

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

ILifeCycleAdapterRun.monitorRate

#### Defined in

[kubernetes-instance-adapter.ts:187](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L187)

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

[kubernetes-instance-adapter.ts:196](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L196)

___

### run

▸ **run**(`config`, `instancesServerPort`, `instanceId`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `InstanceConfig` |
| `instancesServerPort` | `number` |
| `instanceId` | `string` |

#### Returns

`Promise`<`number`\>

#### Implementation of

ILifeCycleAdapterRun.run

#### Defined in

[kubernetes-instance-adapter.ts:91](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L91)

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

ILifeCycleAdapterRun.stats

#### Defined in

[kubernetes-instance-adapter.ts:71](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L71)

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

[kubernetes-instance-adapter.ts:191](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L191)

## Constructors

### constructor

• **new KubernetesInstanceAdapter**(`sthConfig`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `sthConfig` | `STHConfiguration` |

#### Defined in

[kubernetes-instance-adapter.ts:43](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L43)

## Accessors

### kubeClient

• `Private` `get` **kubeClient**(): `KubernetesClientAdapter`

#### Returns

`KubernetesClientAdapter`

#### Defined in

[kubernetes-instance-adapter.ts:56](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L56)

___

### limits

• `get` **limits**(): `InstanceLimits`

#### Returns

`InstanceLimits`

#### Implementation of

ILifeCycleAdapterRun.limits

#### Defined in

[kubernetes-instance-adapter.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L40)

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

[kubernetes-instance-adapter.ts:41](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L41)

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

[kubernetes-instance-adapter.ts:78](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L78)
