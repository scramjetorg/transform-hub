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

[kubernetes-instance-adapter.ts:34](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L34)

___

### \_limits

• `Private` `Optional` **\_limits**: `InstanceLimits` = `{}`

#### Defined in

[kubernetes-instance-adapter.ts:37](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L37)

___

### \_runnerName

• `Private` `Optional` **\_runnerName**: `string`

#### Defined in

[kubernetes-instance-adapter.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L33)

___

### adapterConfig

• `Private` **adapterConfig**: `K8SAdapterConfiguration`

#### Defined in

[kubernetes-instance-adapter.ts:36](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L36)

___

### logger

• **logger**: `IObjectLogger`

#### Implementation of

ILifeCycleAdapterMain.logger

#### Defined in

[kubernetes-instance-adapter.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L30)

___

### name

• **name**: `string` = `"KubernetesInstanceAdapter"`

#### Defined in

[kubernetes-instance-adapter.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L31)

## Methods

### cleanup

▸ **cleanup**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.cleanup

#### Defined in

[kubernetes-instance-adapter.ts:179](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L179)

___

### getCrashLog

▸ **getCrashLog**(): `Promise`<`string`[]\>

#### Returns

`Promise`<`string`[]\>

#### Implementation of

ILifeCycleAdapterMain.getCrashLog

#### Defined in

[kubernetes-instance-adapter.ts:204](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L204)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.init

#### Defined in

[kubernetes-instance-adapter.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L63)

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

[kubernetes-instance-adapter.ts:184](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L184)

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

[kubernetes-instance-adapter.ts:193](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L193)

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

[kubernetes-instance-adapter.ts:90](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L90)

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

[kubernetes-instance-adapter.ts:70](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L70)

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

[kubernetes-instance-adapter.ts:188](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L188)

## Constructors

### constructor

• **new KubernetesInstanceAdapter**(`sthConfig`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `sthConfig` | `STHConfiguration` |

#### Defined in

[kubernetes-instance-adapter.ts:42](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L42)

## Accessors

### kubeClient

• `Private` `get` **kubeClient**(): `KubernetesClientAdapter`

#### Returns

`KubernetesClientAdapter`

#### Defined in

[kubernetes-instance-adapter.ts:55](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L55)

___

### limits

• `get` **limits**(): `InstanceLimits`

#### Returns

`InstanceLimits`

#### Implementation of

ILifeCycleAdapterRun.limits

#### Defined in

[kubernetes-instance-adapter.ts:39](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L39)

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

[kubernetes-instance-adapter.ts:40](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L40)

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

[kubernetes-instance-adapter.ts:77](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L77)
