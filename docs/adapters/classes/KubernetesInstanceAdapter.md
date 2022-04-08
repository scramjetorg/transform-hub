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
- [\_runnerName](KubernetesInstanceAdapter.md#_runnername)
- [adapterConfig](KubernetesInstanceAdapter.md#adapterconfig)
- [logger](KubernetesInstanceAdapter.md#logger)
- [name](KubernetesInstanceAdapter.md#name)

### Methods

- [cleanup](KubernetesInstanceAdapter.md#cleanup)
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

## Properties

### \_kubeClient

• `Private` `Optional` **\_kubeClient**: `KubernetesClientAdapter`

#### Defined in

[kubernetes-instance-adapter.ts:31](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L31)

___

### \_runnerName

• `Private` `Optional` **\_runnerName**: `string`

#### Defined in

[kubernetes-instance-adapter.ts:30](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L30)

___

### adapterConfig

• `Private` **adapterConfig**: `K8SAdapterConfiguration`

#### Defined in

[kubernetes-instance-adapter.ts:33](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L33)

___

### logger

• **logger**: `IObjectLogger`

#### Implementation of

ILifeCycleAdapterMain.logger

#### Defined in

[kubernetes-instance-adapter.ts:27](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L27)

___

### name

• **name**: `string` = `"KubernetesInstanceAdapter"`

#### Defined in

[kubernetes-instance-adapter.ts:28](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L28)

## Methods

### cleanup

▸ **cleanup**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.cleanup

#### Defined in

[kubernetes-instance-adapter.ts:152](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L152)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

ILifeCycleAdapterMain.init

#### Defined in

[kubernetes-instance-adapter.ts:56](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L56)

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

[kubernetes-instance-adapter.ts:157](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L157)

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

[kubernetes-instance-adapter.ts:166](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L166)

___

### run

▸ **run**(`config`, `instancesServerPort`, `instanceId`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `SequenceConfig` |
| `instancesServerPort` | `number` |
| `instanceId` | `string` |

#### Returns

`Promise`<`number`\>

#### Implementation of

ILifeCycleAdapterRun.run

#### Defined in

[kubernetes-instance-adapter.ts:69](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L69)

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

[kubernetes-instance-adapter.ts:63](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L63)

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

[kubernetes-instance-adapter.ts:161](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L161)

## Constructors

### constructor

• **new KubernetesInstanceAdapter**(`sthConfig`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `sthConfig` | `STHConfiguration` |

#### Defined in

[kubernetes-instance-adapter.ts:35](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L35)

## Accessors

### kubeClient

• `Private` `get` **kubeClient**(): `KubernetesClientAdapter`

#### Returns

`KubernetesClientAdapter`

#### Defined in

[kubernetes-instance-adapter.ts:48](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/adapters/src/kubernetes-instance-adapter.ts#L48)
