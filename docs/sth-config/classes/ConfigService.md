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

[sth-config/src/config-service.ts:99](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/sth-config/src/config-service.ts#L99)

## Methods

### getConfig

▸ **getConfig**(): `STHConfiguration`

#### Returns

`STHConfiguration`

#### Defined in

[sth-config/src/config-service.ts:107](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/sth-config/src/config-service.ts#L107)

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

[sth-config/src/config-service.ts:119](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/sth-config/src/config-service.ts#L119)

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

[sth-config/src/config-service.ts:111](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/sth-config/src/config-service.ts#L111)

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

[sth-config/src/config-service.ts:115](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/sth-config/src/config-service.ts#L115)
