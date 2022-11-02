# icure-react-native-crypto

Cryptography package for iCure for **React Native**.

## Table of Contents

<!-- TOC -->
* [icure-react-native-crypto](#icure-react-native-crypto)
  * [Table of Contents](#table-of-contents)
  * [Installation](#installation)
    * [Cryptography libraries](#cryptography-libraries)
    * [iCure libraries](#icure-libraries)
      * [iCure Medical Typescript SDK](#icure-medical-typescript-sdk)
      * [iCure Typescript SDK](#icure-typescript-sdk)
  * [Usage](#usage)
    * [iCure Medical Typescript SDK](#icure-medical-typescript-sdk)
    * [iCure Typescript SDK](#icure-typescript-sdk)
  * [Contributing](#contributing)
  * [License](#license)
<!-- TOC -->

## Installation

### Cryptography libraries

```sh
npm install @icure/icure-react-native-crypto @craftzdog/react-native-buffer @icure/icure-react-native-crypto @icure/react-native-aes-crypto @icure/react-native-rsa-native @react-native-async-storage/async-storage react-native-get-random-values react-native-quick-base64
```

```sh
yarn add @icure/icure-react-native-crypto @craftzdog/react-native-buffer @icure/icure-react-native-crypto @icure/react-native-aes-crypto @icure/react-native-rsa-native @react-native-async-storage/async-storage react-native-get-random-values react-native-quick-base64
```

### iCure libraries

You may want to install the following libraries to use iCure depending of your needs. If you already have the MedTech
libraries installed, it is not mandatory to add the iCure SDK your project.

#### iCure Medical Typescript SDK

```sh
npm install @icure/medical-device-sdk
```

```sh
yarn add @icure/medical-device-sdk
```

#### iCure Typescript SDK

```sh
npm install @icure/api
```

```sh
yarn add @icure/api
```

## Usage

### iCure Medical Typescript SDK

To use the iCure MedTech SDK, you need to import the `@icure/medical-device-sdk` package (v1.0.0 or above).

```typescript
import crypto from '@icure/icure-react-native-crypto';
import { AnonymousMedTechApiBuilder } from '@icure/medical-device-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageFacade } from "@icure/medical-device-sdk";

Buffer = require('@craftzdog/react-native-buffer').Buffer;

// ...

/*
 * Since React-Native don't have it's own implementation of LocalStorage,
 * we have to provide a custom implementation to the iCure Medtech SDK through AnonymousMedTechApi or MedTechApi.
 * I'd recommend to use the @react-native-async-storage/async-storage package.
*/
export class AsyncStorageImpl implements StorageFacade<string> {

  async getItem(key: string): Promise<string | undefined> {
    return await AsyncStorage.getItem(key) ?? undefined;
  }

  async setItem(key: string, valueToStore: string): Promise<void> {
    await AsyncStorage.setItem(key, valueToStore)
      .then(() => console.log("Stored key: " + key))
      .catch((error) => console.log("Error storing key: " + key + " - " + error));
  }

  async deleteItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key)
      .then(() => console.log("Deleted key: " + key))
      .catch((error) => console.log("Error deleting key: " + key + " - " + error));
  }
}

// ...

const anonymousMedTechApi = await new AnonymousMedTechApiBuilder()
  .withICureBaseUrl(iCureUrl)
  .withMsgGwUrl(msgGtwUrl)
  .withMsgGwSpecId(msgGtwSpecId)
  .withCrypto(crypto as Crypto) // import crypto from '@icure/icure-react-native-crypto';
  .withAuthProcessByEmailId(authProcessId)
  .withAuthProcessBySmsId(authProcessId)
  .withStorage(new AsyncStorageImpl()) // Implementation of StorageFacade interface that we have created above
  .build();
```

### iCure Typescript SDK

To use the iCure SDK, you need to import the `@icure/api` package (v6.0.0 or above).

```typescript
import crypto from '@icure/icure-react-native-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageFacade } from "@icure/medical-device-sdk";
import { KeyStorageImpl } from '@icure/api';
import { Api } from '@icure/api'

Buffer = require('@craftzdog/react-native-buffer').Buffer;

// ...

/*
 * Since React-Native don't have it's own implementation of LocalStorage, we have to provide a custom implementation to the iCure SDK through Api.
 * I'd recommend to use the @react-native-async-storage/async-storage package.
 */
export class AsyncStorageImpl implements StorageFacade<string> {

  async getItem(key: string): Promise<string | undefined> {
    return await AsyncStorage.getItem(key) ?? undefined;
  }

  async setItem(key: string, valueToStore: string): Promise<void> {
    await AsyncStorage.setItem(key, valueToStore)
      .then(() => console.log("Stored key: " + key))
      .catch((error) => console.log("Error storing key: " + key + " - " + error));
  }

  async deleteItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key)
      .then(() => console.log("Deleted key: " + key))
      .catch((error) => console.log("Error deleting key: " + key + " - " + error));
  }
}

// ...

const apis = Api(
  icureUrl,
  username,
  password,
  crypto, // import of @icure/icure-react-native-crypto
  fetch,
  forceAuthorization,
  autoLogin,
  new AsyncStorageImpl(), // StorageFacade implementation that we have created above
  new KeyStorageImpl() // KeyStorage implementation that @icure/api exposes
);

```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
