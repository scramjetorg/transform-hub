[@scramjet/sth-config](../README.md) / [Exports](../modules.md) / ConfigService

# Class: ConfigService

## Table of contents

### Constructors

- [constructor](ConfigService.md#constructor)

### Methods

- [getConfig](ConfigService.md#getconfig)
- [getConfigInfo](ConfigService.md#getconfiginfo)
- [getDockerConfig](ConfigService.md#getdockerconfig)
- [update](ConfigService.md#update)

## Constructors

### constructor

• **new ConfigService**(`config?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config?` | `DeepPartial`<`STHConfiguration`\> |

#### Defined in

[sth-config/src/config-service.ts:80](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/sth-config/src/config-service.ts#L80)

## Methods

### getConfig

▸ **getConfig**(): `STHConfiguration`

#### Returns

`STHConfiguration`

#### Defined in

[sth-config/src/config-service.ts:88](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/sth-config/src/config-service.ts#L88)

___

### getConfigInfo

▸ `Static` **getConfigInfo**(`config`): `PublicSTHConfiguration`

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `STHConfiguration` |

#### Returns

`PublicSTHConfiguration`

#### Defined in

[sth-config/src/config-service.ts:100](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/sth-config/src/config-service.ts#L100)

___

### getDockerConfig

▸ **getDockerConfig**(): `Object`

#### Returns

`Object`

| Name | Type | Description |
| :------ | :------ | :------ |
| `prerunner` | `ContainerConfiguration` | PreRunner container configuration. |
| `runner` | `RunnerContainerConfiguration` | Runner container configuration. |
| `runnerImages` | { `node`: `string` ; `python3`: `string`  } | - |
| `runnerImages.node` | `string` | - |
| `runnerImages.python3` | `string` | - |

#### Defined in

[sth-config/src/config-service.ts:92](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/sth-config/src/config-service.ts#L92)

___

### update

▸ **update**(`config`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `DeepPartial`<`STHConfiguration`\> |

#### Returns

`void`

#### Defined in

[sth-config/src/config-service.ts:96](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/sth-config/src/config-service.ts#L96)
