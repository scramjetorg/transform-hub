[@scramjet/types](../README.md) / [Exports](../modules.md) / ILocalStorage
==========================================================================

# Interface: ILocalStorage

The `ILocalStorage` interface defines the asynchronous API for persistent key–value storage. It mimics the browser’s localStorage API but operates in an asynchronous, non‑blocking manner. Runners use this interface to read and write state data to a chosen storage medium.

## Table of contents

### Methods
- [getItem](#getitem)
- [setItem](#setitem)
- [removeItem](#removeitem)
- [clear](#clear)

___

### getItem

**getItem(key: string): Promise<string | null>**

Retrieves the stored value associated with the specified key.

**Parameters:**

| Name | Type   | Description                                 |
| :--- | :----- | :------------------------------------------ |
| `key`  | `string` | A unique identifier for the stored data.   |

**Returns:**  
A Promise that resolves to the stored value as a string, or `null` if the key does not exist.

___

### setItem

**setItem(key: string, value: string): Promise<void>**

Stores a value with the specified key. If the key already exists, its value is updated.

**Parameters:**

| Name   | Type     | Description                                  |
| :----- | :------- | :------------------------------------------- |
| `key`    | `string` | A unique identifier for the data to store.   |
| `value`  | `string` | The string value to store.                   |

**Returns:**  
A Promise that resolves when the operation is complete.

___

### removeItem

**removeItem(key: string): Promise<void>**

Removes the stored value associated with the specified key.

**Parameters:**

| Name  | Type   | Description                               |
| :---- | :----- | :---------------------------------------- |
| `key`   | `string` | The unique identifier for the data to remove. |

**Returns:**  
A Promise that resolves when the removal is complete.

___

### clear

**clear(): Promise<void>**

Clears all stored data.

**Returns:**  
A Promise that resolves when all stored items have been removed.
