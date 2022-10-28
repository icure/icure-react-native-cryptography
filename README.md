# icure-react-native-crypto

Cryptography package for iCure

## Installation

### Cryptography

```sh
npm install @icure/icure-react-native-crypto @craftzdog/react-native-buffer @icure/icure-react-native-crypto @icure/medical-device-sdk @icure/react-native-aes-crypto @icure/react-native-rsa-native @react-native-async-storage/async-storage react-native-get-random-values react-native-quick-base64
```

```sh
yarn add @icure/icure-react-native-crypto @craftzdog/react-native-buffer @icure/icure-react-native-crypto @icure/medical-device-sdk @icure/react-native-aes-crypto @icure/react-native-rsa-native @react-native-async-storage/async-storage react-native-get-random-values react-native-quick-base64
```

### iCure

```sh
npm install @icure/medical-device-sdk
```

```sh
yarn add @icure/medical-device-sdk
```

## Usage

```typescript
import crypto from '@icure/icure-react-native-crypto';
import { AnonymousMedTechApiBuilder } from '@icure/medical-device-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';

Buffer = require('@craftzdog/react-native-buffer').Buffer;

// ...

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
      .withCrypto(crypto as Crypto)
      .withAuthProcessByEmailId(authProcessId)
      .withAuthProcessBySmsId(authProcessId)
      .withStorage(new AsyncStorageImpl())
      .build();
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
