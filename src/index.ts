import 'react-native-get-random-values';

import { v4 as uuid } from 'uuid';
import { b642ab, b642ua, ua2b64 } from './utils/binary-utils';
import { stringifyPrivateJWK, stringifyPublicJWK } from './utils/key-utils';

import {
  hex2ua,
  jwk2pkcs8,
  jwk2spki,
  pkcs8ToJwk,
  spkiToJwk,
  ua2hex,
} from '@icure/api';

import Aes from '@icure/react-native-aes-crypto';
import { RSA } from '@icure/react-native-rsa-native';
import { CryptoKeyStore } from './utils/key-store';

export { Buffer } from '@craftzdog/react-native-buffer';

const store = CryptoKeyStore.getInstance();

const algorithms = {
  128: 'aes-128-cbc',
  192: 'aes-192-cbc',
  256: 'aes-256-cbc',
};

const decrypt = async (
  algorithm: RsaOaepParams | AesCbcParams,
  key: CryptoKey,
  data: BufferSource
) => {
  try {
    if (algorithm.name === 'RSA-OAEP') {
      const privateKey = stringifyPrivateJWK(
        (await exportKey('jwk', key)) as JsonWebKey
      );
      const toDecrypt = ua2b64(data as ArrayBuffer);
      const decrypted = await RSA.decrypt64(
        toDecrypt,
        `-----BEGIN RSA PRIVATE KEY-----\n${privateKey}\n-----END RSA PRIVATE KEY-----\n`
      );

      if (decrypted) {
        return b642ua(decrypted);
      }
    }

    if (algorithm.name === 'AES-CBC') {
      const aesKey = ua2hex((await exportKey('raw', key)) as ArrayBuffer);
      const toDecrypt = ua2b64(data as ArrayBuffer);
      const iv = ua2hex((algorithm as AesCbcParams).iv as ArrayBuffer);
      const decrypted = await Aes.decrypt64(
        toDecrypt,
        aesKey,
        iv,
        algorithms[
          (key.algorithm as AesKeyAlgorithm).length as 128 | 192 | 256
        ] as 'aes-128-cbc' | 'aes-192-cbc' | 'aes-256-cbc'
      );
      if (decrypted) {
        return b642ua(decrypted);
      }
    }

    throw Error(`RNIcureCrypto::decrypt - No support`);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const encrypt = async (
  algorithm: RsaOaepParams | AesCbcParams,
  key: CryptoKey,
  data: BufferSource
) => {
  try {
    if (algorithm.name === 'RSA-OAEP') {
      const publicKey = stringifyPublicJWK(
        (await exportKey('jwk', key)) as JsonWebKey
      );
      const toEncrypt = ua2b64(data as ArrayBuffer);

      const encrypted = await RSA.encrypt64(toEncrypt, publicKey);

      if (encrypted) {
        return b642ab(encrypted);
      }
    }

    if (algorithm.name === 'AES-CBC') {
      const aesKey = ua2hex((await exportKey('raw', key)) as ArrayBuffer);
      const toEncrypt = ua2b64(data as ArrayBuffer);
      const iv = ua2hex((algorithm as AesCbcParams).iv as ArrayBuffer);

      const encrypted = await Aes.encrypt64(
        toEncrypt,
        aesKey,
        iv,
        algorithms[
          (key.algorithm as AesKeyAlgorithm).length as 128 | 192 | 256
        ] as 'aes-128-cbc' | 'aes-192-cbc' | 'aes-256-cbc'
      );

      if (encrypted) {
        return b642ua(encrypted);
      }
    }

    throw Error(`RNIcureCrypto::encrypt - No support`);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const exportKey = async (
  format: 'jwk' | 'raw' | 'pkcs8' | 'spki',
  key: CryptoKey
): Promise<JsonWebKey | ArrayBuffer> => {
  try {
    if (
      key?.algorithm?.name === 'AES-CBC' ||
      key?.algorithm?.name === 'RSA-OAEP'
    ) {
      const exporters = {
        jwk: async (key: CryptoKey) => {
          return await store.exportKey('jwk', key);
        },
        raw: async (key: CryptoKey) => {
          return await store.exportKey('raw', key);
        },
        spki: async (key: CryptoKey) => {
          const jwk = await store.exportKey('jwk', key);
          return hex2ua(jwk2spki(jwk as JsonWebKey));
        },
        pkcs8: async (key: CryptoKey) => {
          const jwk = await store.exportKey('jwk', key);
          return hex2ua(jwk2pkcs8(jwk as JsonWebKey));
        },
      };

      const exporter = exporters[format];
      if (exporter) {
        return await exporter(key);
      }
    }

    throw Error(`RNIcureCrypto::exportKey - No support`);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const generateKey = async (
  algorithm: RsaHashedKeyAlgorithm | AesKeyGenParams,
  extractable: boolean,
  keyUsages: ReadonlyArray<KeyUsage>
): Promise<CryptoKeyPair | CryptoKey> => {
  const keyRegex = /-----.*-----(.*)-----.*-----/;

  const stripRSAKeyHeaderAndFooter = (key: string) => {
    const match = key.replace(/\n/, '').replace(/\s/g, '').match(keyRegex);
    if (match) {
      return match[1];
    }
    return key;
  };

  try {
    if (algorithm.name === 'RSA-OAEP') {
      const keyPair = await RSA.generateKeys(
        (algorithm as RsaHashedKeyAlgorithm).modulusLength
      );

      const publicKey: CryptoKey = await importKey(
        'jwk',
        spkiToJwk(b642ua(stripRSAKeyHeaderAndFooter(keyPair.public)!)),
        algorithm as RsaHashedKeyAlgorithm,
        extractable,
        ['encrypt']
      );

      const privateKey: CryptoKey = await importKey(
        'jwk',
        pkcs8ToJwk(
          b642ab(stripRSAKeyHeaderAndFooter(keyPair.private)!) as ArrayBuffer
        ),
        algorithm as RsaHashedKeyAlgorithm,
        extractable,
        ['decrypt']
      );

      return {
        publicKey,
        privateKey,
      };
    }

    if (algorithm.name === 'AES-CBC') {
      const nativeKey = await Aes.randomKey(
        (algorithm as AesKeyGenParams).length / 8
      );
      const nativeRawKey = new Uint8Array(hex2ua(nativeKey));
      const cryptoKey = await importKey(
        'raw',
        nativeRawKey,
        algorithm as AesKeyGenParams,
        extractable,
        keyUsages
      );

      return cryptoKey;
    }

    throw Error(`RNIcureCrypto::generateKey - No support`);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const importKey = async (
  format: 'jwk' | 'raw',
  keyData: JsonWebKey | BufferSource,
  algorithm: RsaHashedKeyAlgorithm | AesKeyAlgorithm,
  extractable: boolean,
  keyUsages: ReadonlyArray<KeyUsage>
): Promise<CryptoKey> => {
  try {
    if (algorithm?.name === 'AES-CBC' || algorithm?.name === 'RSA-OAEP') {
      return await store.importKey(
        format,
        keyData,
        algorithm,
        extractable,
        keyUsages
      );
    }

    throw Error(`RNIcureCrypto::importKey - No support`);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const randomUUID = () => {
  return uuid();
};

const crypto: Crypto = {
  getRandomValues: globalThis.crypto.getRandomValues,
  subtle: {
    encrypt: encrypt,
    decrypt: decrypt,
    exportKey: exportKey,
    importKey: importKey,
    generateKey: generateKey,
    deriveBits: () => {
      throw Error(`RNIcureCrypto::deriveBits - Not implemented`);
    },
    deriveKey: () => {
      throw Error(`RNIcureCrypto::deriveKey - Not implemented`);
    },
    digest: () => {
      throw Error(`RNIcureCrypto::digest - Not implemented`);
    },
    sign: () => {
      throw Error(`RNIcureCrypto::sign - Not implemented`);
    },
    unwrapKey: () => {
      throw Error(`RNIcureCrypto::unwrapKey - Not implemented`);
    },
    verify: () => {
      throw Error(`RNIcureCrypto::verify - Not implemented`);
    },
    wrapKey: () => {
      throw Error(`RNIcureCrypto::wrapKey - Not implemented`);
    },
  } as SubtleCrypto,
  randomUUID: randomUUID,
};

export default { ...crypto };
