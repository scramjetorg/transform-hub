[@scramjet/supervisor](README.md) / Exports

# @scramjet/supervisor

## Table of contents

### Interfaces

- [DockerHelper](interfaces/dockerhelper.md)

### Type aliases

- [DockerAdapterRunConfig](modules.md#dockeradapterrunconfig)
- [DockerAdapterRunResponse](modules.md#dockeradapterrunresponse)
- [DockerAdapterStreams](modules.md#dockeradapterstreams)
- [DockerAdapterVolumeConfig](modules.md#dockeradaptervolumeconfig)
- [DockerContainer](modules.md#dockercontainer)
- [DockerImage](modules.md#dockerimage)
- [DockerVolume](modules.md#dockervolume)

## Type aliases

### DockerAdapterRunConfig

Ƭ **DockerAdapterRunConfig**: *object*

Configuration used to run command in container.

#### Type declaration:

Name | Type | Description |
:------ | :------ | :------ |
`binds`? | *string*[] | **`property`** {string[]} binds Directories mount configuration.  |
`command` | *string*[] | Command with optional parameters.  **`property`** {string[]} command Command to be executed.  |
`imageName` | *string* | **`property`** {string} imageName Image name.  |
`volumes`? | [*DockerAdapterVolumeConfig*](modules.md#dockeradaptervolumeconfig)[] | **`property`** {DockerAdapterVolumeConfig[]} volumes Volumes configuration.  |

Defined in: [types.ts:46](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L46)

___

### DockerAdapterRunResponse

Ƭ **DockerAdapterRunResponse**: *object*

Result of running command in container.

#### Type declaration:

Name | Type |
:------ | :------ |
`stopAndRemove` | Function |
`streams` | [*DockerAdapterStreams*](modules.md#dockeradapterstreams) |

Defined in: [types.ts:93](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L93)

___

### DockerAdapterStreams

Ƭ **DockerAdapterStreams**: *object*

Standard streams connected with container.

#### Type declaration:

Name | Type |
:------ | :------ |
`stderr` | Stream |
`stdin` | Writable |
`stdout` | Stream |

Defined in: [types.ts:73](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L73)

___

### DockerAdapterVolumeConfig

Ƭ **DockerAdapterVolumeConfig**: *object*

Volume mounting configuration.

#### Type declaration:

Name | Type |
:------ | :------ |
`mountPoint` | *string* |
`volume` | [*DockerVolume*](modules.md#dockervolume) |

Defined in: [types.ts:29](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L29)

___

### DockerContainer

Ƭ **DockerContainer**: *string*

Docker container.

Defined in: [types.ts:15](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L15)

___

### DockerImage

Ƭ **DockerImage**: *string*

Docker image.

Defined in: [types.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L8)

___

### DockerVolume

Ƭ **DockerVolume**: *string*

Docker volume.

Defined in: [types.ts:22](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/6eeb648/packages/supervisor/src/lib/adapters/docker/types.ts#L22)
