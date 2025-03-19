[@scramjet/host](../README.md) / [Exports](../modules.md) / IStorageAdapter
=============================================================================

# Interface: IStorageAdapter

The `IStorageAdapter` interface defines the operations that every local storage adapter implementation must provide on the Host side. This interface is implemented by adapters such as the file‑based adapter (using node‑localstorage) and the CouchDB‑based adapter.

## Table of contents

### Methods
- [init](#init)
- [setItem](#setitem)
- [getItem](#getitem)
- [removeItem](#removeitem)
- [clear](#clear)
- [length](#length)
- [getAllItems](#getallitems)

___

### init

**init(): Promise<void>**

Initializes the storage adapter. This may include verifying that the storage resource (e.g. a folder or database) exists and creating it if necessary.

**Returns:**  
A Promise that resolves once initialization is complete.

___

### setItem

**setItem(key: string, value: string): Promise<void>**

Persists a value associated with the specified key. If a record for the key exists, it is updated; otherwise, a new record is created.

**Parameters:**

| Name   | Type     | Description                                     |
| :----- | :------- | :---------------------------------------------- |
| `key`    | `string` | A unique identifier for the data.                |
| `value`  | `string` | The data to store (as a string).                 |

**Returns:**  
A Promise that resolves when the data is successfully stored.

___

### getItem

**getItem(key: string): Promise<string | null>**

Retrieves the stored value associated with the specified key.

**Parameters:**

| Name  | Type   | Description                                 |
| :---- | :----- | :------------------------------------------ |
| `key`   | `string` | A unique identifier for the stored data.     |

**Returns:**  
A Promise that resolves to the stored value as a string, or `null` if the key does not exist.

___

### removeItem

**removeItem(key: string): Promise<void>**

Removes the stored data associated with the specified key.

**Parameters:**

| Name  | Type   | Description                                  |
| :---- | :----- | :------------------------------------------- |
| `key`   | `string` | The unique identifier for the data to remove.  |

**Returns:**  
A Promise that resolves when the removal is complete.

___

### clear

**clear(): Promise<void>**

Clears all stored data by removing every stored item.

**Returns:**  
A Promise that resolves once all stored items have been removed.

___

### length

**length(): number**

Returns the number of stored items.

**Returns:**  
A number representing the count of items currently stored.

___

### getAllItems

**getAllItems(): Promise<Record<string, string | null>>**

Retrieves all stored items as a key–value map.

**Returns:**  
A Promise that resolves to an object containing all stored items.
