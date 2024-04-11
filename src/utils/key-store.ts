/*
 * Copyright (C) 2022 Bspoke IT SRL
 *
 * This file is part of react-native-icure-crypto.
 *
 * react-native-icure-crypto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * react-native-icure-crypto is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with react-native-icure-crypto.  If not, see <http://www.gnu.org/licenses/>.
 */

import { b64Url2ua, ua2b64Url } from './binary-utils';

type KeyData = { [key: string]: ArrayBuffer };

const AES_KEY_DATA_KEYS = ['k'];
const RSA_OAEP_KEY_DATA_KEYS = ['n', 'e', 'd', 'q', 'p', 'dq', 'dp', 'qi'];

const abs2kd = (abs: ArrayBuffer[], keys: string[]): KeyData => {
  return keys.reduce((acc, key, index) => {
    acc[key] = abs[index];

    return acc;
  }, {} as any) as KeyData;
};

const jwk2kd = (jwk: JsonWebKey, keys: string[]): KeyData => {
  return keys.reduce((acc, key) => {
    if (jwk[key as keyof JsonWebKey]) {
      acc[key] = b64Url2ua(jwk[key as keyof JsonWebKey] as string);
    }
    return acc;
  }, {} as any) as KeyData;
};

const kd2jwk = (keyData: KeyData, defaultJwk: JsonWebKey): JsonWebKey => {
  return Object.keys(keyData).reduce((acc, key) => {
    if (keyData[key]) {
      acc[key] = ua2b64Url(keyData[key]!);
    }
    return acc;
  }, defaultJwk as any) as JsonWebKey;
};

const AESCBCUtils = {
  jwk2raw: (jwk: JsonWebKey): KeyData => {
    return jwk2kd(jwk, AES_KEY_DATA_KEYS);
  },
  raw2jwk: (cryptoKey: CryptoKey, keyData: KeyData): JsonWebKey => {
    return kd2jwk(keyData, {
      kty: 'oct',
      key_ops: cryptoKey.usages,
      alg: 'A256CBC',
      ext: cryptoKey.extractable,
    });
  },
};

const RSAOAEPUtils = {
  jwk2raw: (jwk: JsonWebKey): KeyData => {
    return jwk2kd(jwk, RSA_OAEP_KEY_DATA_KEYS);
  },
  raw2jwk: (cryptoKey: CryptoKey, keyData: KeyData) => {
    return kd2jwk(keyData, {
      kty: 'RSA',
      key_ops: cryptoKey.usages,
      alg: 'RSA-OAEP',
      ext: cryptoKey.extractable,
    });
  },
};

export class CryptoKeyStore {
  private static instance: CryptoKeyStore;

  private keys: Array<{ cryptoKey: CryptoKey; keyData: KeyData }>;

  private constructor() {
    this.keys = [];
  }

  public static getInstance(): CryptoKeyStore {
    if (!CryptoKeyStore.instance) {
      CryptoKeyStore.instance = new CryptoKeyStore();
    }

    return CryptoKeyStore.instance;
  }

  private addCryptoKeyData = (cryptoKey: CryptoKey, keyData: KeyData): void => {
    this.keys.push({
      cryptoKey: cryptoKey,
      keyData: keyData,
    });
  };

  private getCryptoKeyData = (cryptoKey: CryptoKey): KeyData | undefined => {
    for (var i = 0; i < this.keys.length; i += 1) {
      if (this.keys[i]!.cryptoKey === cryptoKey) {
        return this.keys[i]!.keyData;
      }
    }
    return undefined;
  };

  // @ts-ignore
  private removeCryptoKeyData = (cryptoKey: CryptoKey): void => {
    for (var i = 0; i < this.keys.length; i += 1) {
      if (this.keys[i]!.cryptoKey === cryptoKey) {
        this.keys = this.keys.splice(i, 1);
        return;
      }
    }
  };

  public exportKey = (
    format: 'jwk' | 'raw',
    cryptoKey: CryptoKey
  ): Promise<JsonWebKey | ArrayBuffer> => {
    /*
        Validate Key algorithm
    */

    if (
      !!cryptoKey?.algorithm?.name &&
      cryptoKey.algorithm.name !== 'RSA-OAEP' &&
      cryptoKey.algorithm.name !== 'AES-CBC'
    ) {
      throw Error(
        `CryptoKeyStore::exportKey - Unsupported key algorithm ${cryptoKey?.algorithm?.name}. Supported formats are 'RSA-OAEP' and 'AES-CBC'`
      );
    }

    /*
        Validate requested Key format by Key algorithm
    */

    if (
      cryptoKey.algorithm.name === 'AES-CBC' &&
      !!format &&
      format !== 'raw' &&
      format !== 'jwk'
    ) {
      throw Error(
        `CryptoKeyStore::exportKey - Unsupported AES-CBC format ${format}. Supported formats are 'raw' and 'jwk'`
      );
    }

    if (
      cryptoKey.algorithm.name === 'RSA-OAEP' &&
      !!format &&
      format !== 'jwk'
    ) {
      throw Error(
        `CryptoKeyStore::exportKey - Unsupported RSA-OAEP format ${format}. Supported formats are 'jwk'`
      );
    }

    /*
        Fetch and validate Key data
    */

    const keyData = this.getCryptoKeyData(cryptoKey);

    if (!keyData) {
      throw Error(
        `CryptoKeyStore::exportKey - No keyData found for provided CryptoKey`
      );
    }

    /*
        Handle AES-CBC export
        NOTICE: In the 'raw' case, the keyData (ArrayBuffer) is unwrap from the Keydata by getting the 'k' key value.
    */

    if (cryptoKey.algorithm.name === 'AES-CBC') {
      return Promise.resolve(
        format === 'jwk' ? AESCBCUtils.raw2jwk(cryptoKey, keyData) : keyData.k!
      );
    }

    /*
        Handle RSA-OAEP export
    */

    if (cryptoKey.algorithm.name === 'RSA-OAEP') {
      return Promise.resolve(RSAOAEPUtils.raw2jwk(cryptoKey, keyData));
    }

    throw Error(`CryptoKeyStore::exportKey - Impossible to export the key`);
  };

  public importKey = (
    format: 'jwk' | 'raw',
    keyData: JsonWebKey | BufferSource,
    algorithm: RsaHashedKeyAlgorithm | AesKeyAlgorithm,
    extractable: boolean,
    keyUsages: ReadonlyArray<KeyUsage>
  ): Promise<CryptoKey> => {
    /*
        Validate Key algorithm
    */

    if (
      !!algorithm?.name &&
      algorithm.name !== 'RSA-OAEP' &&
      algorithm.name !== 'AES-CBC'
    ) {
      throw Error(
        `CryptoKeyStore::importKey - Unsupported key algorithm ${algorithm.name}. Supported formats are 'RSA-OAEP' and 'AES-CBC'`
      );
    }

    /*
        Validate provided Key format by Key algorithm
    */

    if (
      algorithm.name === 'AES-CBC' &&
      !!format &&
      format !== 'raw' &&
      format !== 'jwk'
    ) {
      throw Error(
        `CryptoKeyStore::importKey - Unsupported AES-CBC format ${format}. Supported formats are 'raw' and 'jwk'`
      );
    }

    if (algorithm.name === 'RSA-OAEP' && !!format && format !== 'jwk') {
      throw Error(
        `CryptoKeyStore::importKey - Unsupported RSA-OAEP format ${format}. Supported formats are 'jwk'`
      );
    }

    /*
        Handle AES-CBC import
    */

    if (algorithm.name === 'AES-CBC') {
      const cryptoKeyData =
        format === 'jwk'
          ? AESCBCUtils.jwk2raw(keyData as JsonWebKey)
          : abs2kd([keyData as ArrayBuffer], AES_KEY_DATA_KEYS);

      const updatedAlgorithm = {
        ...algorithm,
        length: cryptoKeyData.k!.byteLength * 8,
      };

      const cryptoKey: CryptoKey = {
        ...{
          algorithm: updatedAlgorithm,
          extractable: extractable,
          usages: [...keyUsages],
          type: 'secret',
        },
      };

      this.addCryptoKeyData(cryptoKey, cryptoKeyData);

      return Promise.resolve(cryptoKey);
    }

    /*
        Handle RSA-OAEP import
    */

    if (algorithm.name === 'RSA-OAEP' && format === 'jwk') {
      const cryptoKeyData = RSAOAEPUtils.jwk2raw(keyData as JsonWebKey);

      let algorithmName = algorithm.name;
      if (
        (algorithm as RsaHashedKeyAlgorithm).hash.name.toLowerCase() ===
        'sha-256'
      ) {
        algorithmName = `RSA-OAEP-256`;
      }

      const cryptoKey: CryptoKey = {
        ...{
          algorithm: {
            ...algorithm,
            name: algorithmName,
          },
          extractable: extractable,
          usages: [...keyUsages],
          type: cryptoKeyData.d || cryptoKeyData.dq ? 'private' : 'public',
        },
      };

      this.addCryptoKeyData(cryptoKey, cryptoKeyData);

      return Promise.resolve(cryptoKey);
    }

    throw Error(`CryptoKeyStore::importKey - Impossible to import the key`);
  };
}
