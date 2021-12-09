[@scramjet/sth-config](../README.md) / ConfigService

# Class: ConfigService

## Table of contents

### Constructors

- [constructor](configservice.md#constructor)

### Methods

- [getConfig](configservice.md#getconfig)
- [getDockerConfig](configservice.md#getdockerconfig)
- [update](configservice.md#update)

## Constructors

### constructor

• **new ConfigService**(`config?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config?` | `DeepPartial`<`STHConfiguration`\> |

#### Defined in

[sth-config/src/config-service.ts:50](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/sth-config/src/config-service.ts#L50)

## Methods

### getConfig

▸ **getConfig**(): `STHConfiguration`

#### Returns

`STHConfiguration`

#### Defined in

[sth-config/src/config-service.ts:60](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/sth-config/src/config-service.ts#L60)

___

### getDockerConfig

▸ **getDockerConfig**(): `Object`

#### Returns

`Object`

| Name | Type | Description |
| :------ | :------ | :------ |
| `prerunner` | `ContainerConfiguration` | PreRunner container configuration. |
| `runner` | `RunnerContainerConfiguration` | Runner container configuration. |

#### Defined in

[sth-config/src/config-service.ts:64](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/sth-config/src/config-service.ts#L64)

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

[sth-config/src/config-service.ts:68](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/sth-config/src/config-service.ts#L68)
