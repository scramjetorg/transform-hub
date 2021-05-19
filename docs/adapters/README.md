@scramjet/adapters

# @scramjet/adapters

## Table of contents

### Classes

- [DockerodeDockerHelper](classes/dockerodedockerhelper.md)
- [LifecycleDockerAdapterInstance](classes/lifecycledockeradapterinstance.md)
- [LifecycleDockerAdapterSequence](classes/lifecycledockeradaptersequence.md)

### Interfaces

- [IDockerHelper](interfaces/idockerhelper.md)

### Type aliases

- [DockerAdapterResources](README.md#dockeradapterresources)
- [DockerAdapterRunConfig](README.md#dockeradapterrunconfig)
- [DockerAdapterRunResponse](README.md#dockeradapterrunresponse)
- [DockerAdapterStreams](README.md#dockeradapterstreams)
- [DockerAdapterVolumeConfig](README.md#dockeradaptervolumeconfig)
- [DockerAdapterWaitOptions](README.md#dockeradapterwaitoptions)
- [DockerContainer](README.md#dockercontainer)
- [DockerImage](README.md#dockerimage)
- [DockerVolume](README.md#dockervolume)
- [ExitData](README.md#exitdata)

## Type aliases

### DockerAdapterResources

Ƭ **DockerAdapterResources**: { `containerId?`: [*DockerContainer*](README.md#dockercontainer) ; `fifosDir?`: PathLike ; `volumeId?`: [*DockerVolume*](README.md#dockervolume)  }

#### Type declaration:

Name | Type |
------ | ------ |
`containerId?` | [*DockerContainer*](README.md#dockercontainer) |
`fifosDir?` | PathLike |
`volumeId?` | [*DockerVolume*](README.md#dockervolume) |

Defined in: [types.ts:112](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/adapters/src/types.ts#L112)

___

### DockerAdapterRunConfig

Ƭ **DockerAdapterRunConfig**: { `autoRemove?`: *boolean* ; `binds?`: *string*[] ; `command?`: *string*[] ; `envs?`: *string*[] ; `imageName`: *string* ; `maxMem?`: *number* ; `volumes?`: [*DockerAdapterVolumeConfig*](README.md#dockeradaptervolumeconfig)[]  }

Configuration used to run command in container.

#### Type declaration:

Name | Type | Description |
------ | ------ | ------ |
`autoRemove?` | *boolean* | **`property`** {boolean} autoRemove If true container will be removed after container's process exit.  |
`binds?` | *string*[] | **`property`** {string[]} binds Directories mount configuration.  |
`command?` | *string*[] | Command with optional parameters.  **`property`** {string[]} command Command to be executed.  |
`envs?` | *string*[] | **`property`** {string[]} envs A list of environment variables to set inside the container in the form ```["VAR=value", ...]```  |
`imageName` | *string* | **`property`** {string} imageName Image name.  |
`maxMem?` | *number* | **`property`** {number} maxMem Maximum available memory.  |
`volumes?` | [*DockerAdapterVolumeConfig*](README.md#dockeradaptervolumeconfig)[] | **`property`** {DockerAdapterVolumeConfig[]} volumes Volumes configuration.  |

Defined in: [types.ts:48](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/adapters/src/types.ts#L48)

___

### DockerAdapterRunResponse

Ƭ **DockerAdapterRunResponse**: { `containerId`: [*DockerContainer*](README.md#dockercontainer) ; `streams`: [*DockerAdapterStreams*](README.md#dockeradapterstreams) ; `wait`: Function  }

Result of running command in container.

#### Type declaration:

Name | Type |
------ | ------ |
`containerId` | [*DockerContainer*](README.md#dockercontainer) |
`streams` | [*DockerAdapterStreams*](README.md#dockeradapterstreams) |
`wait` | Function |

Defined in: [types.ts:125](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/adapters/src/types.ts#L125)

___

### DockerAdapterStreams

Ƭ **DockerAdapterStreams**: { `stderr`: Stream ; `stdin`: Writable ; `stdout`: Stream  }

Standard streams connected with container.

#### Type declaration:

Name | Type |
------ | ------ |
`stderr` | Stream |
`stdin` | Writable |
`stdout` | Stream |

Defined in: [types.ts:91](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/adapters/src/types.ts#L91)

___

### DockerAdapterVolumeConfig

Ƭ **DockerAdapterVolumeConfig**: { `mountPoint`: *string*  } & { `volume`: [*DockerVolume*](README.md#dockervolume)  } \| { `bind`: *string*  }

Volume mounting configuration.

Defined in: [types.ts:32](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/adapters/src/types.ts#L32)

___

### DockerAdapterWaitOptions

Ƭ **DockerAdapterWaitOptions**: { `condition?`: *not-running* \| *next-exit* \| *removed*  }

#### Type declaration:

Name | Type |
------ | ------ |
`condition?` | *not-running* \| *next-exit* \| *removed* |

Defined in: [types.ts:118](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/adapters/src/types.ts#L118)

___

### DockerContainer

Ƭ **DockerContainer**: *string*

Docker container.

Defined in: [types.ts:18](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/adapters/src/types.ts#L18)

___

### DockerImage

Ƭ **DockerImage**: *string*

Docker image.

Defined in: [types.ts:11](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/adapters/src/types.ts#L11)

___

### DockerVolume

Ƭ **DockerVolume**: *string*

Docker volume.

Defined in: [types.ts:25](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/adapters/src/types.ts#L25)

___

### ExitData

Ƭ **ExitData**: { `statusCode`: ExitCode  }

#### Type declaration:

Name | Type |
------ | ------ |
`statusCode` | ExitCode |

Defined in: [types.ts:108](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/adapters/src/types.ts#L108)
