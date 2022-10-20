import 'react-native-get-random-values';

import { v4 as uuid } from 'uuid';
import {
  b642ab,
  b642ua,
  string2ab,
  ua2b64,
  ua2string,
} from './utils/binary-utils';
import { stringifyPrivateJWK, stringifyPublicJWK } from './utils/key-utils';

import { hex2ua, jwk2pkcs8, jwk2spki, pkcs8ToJwk, spkiToJwk } from '@icure/api';

import Aes from 'react-native-aes-crypto';
import { RSA } from '@icure/react-native-rsa-native';
import { CryptoKeyStore } from './utils/key-store';

export { Buffer } from '@craftzdog/react-native-buffer';

const store = CryptoKeyStore.getInstance();

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
      const decrypted = await RSA.decrypt(toDecrypt, privateKey);

      if (decrypted) {
        return string2ab(decrypted);
      }
    }

    if (algorithm.name === 'AES-CBC') {
      const aesKey = ua2b64((await exportKey('raw', key)) as ArrayBuffer);
      const toDecrypt = ua2b64(data as ArrayBuffer);
      const iv = ua2b64((algorithm as AesCbcParams).iv as ArrayBuffer);
      const decrypted = await Aes.decrypt(toDecrypt, aesKey, iv, 'aes-256-cbc');
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
      const toEncrypt = ua2string(data as ArrayBuffer);

      const encrypted = await RSA.encrypt(toEncrypt, publicKey);

      if (encrypted) {
        return b642ab(encrypted);
      }
    }

    if (algorithm.name === 'AES-CBC') {
      const aesKey = ua2b64((await exportKey('raw', key)) as ArrayBuffer);
      const toEncrypt = ua2b64(data as ArrayBuffer);
      const iv = ua2b64((algorithm as AesCbcParams).iv as ArrayBuffer);

      const encrypted = await Aes.encrypt(toEncrypt, iv, aesKey, 'aes-256-cbc');

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
  algorithm: RsaKeyAlgorithm | AesKeyGenParams,
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
        (algorithm as RsaKeyAlgorithm).modulusLength
      );

      const publicKey: CryptoKey = await importKey(
        'jwk',
        spkiToJwk(b642ua(stripRSAKeyHeaderAndFooter(keyPair.public)!)),
        algorithm as RsaKeyAlgorithm,
        extractable,
        ['encrypt']
      );

      const privateKey: CryptoKey = await importKey(
        'jwk',
        pkcs8ToJwk(
          b642ab(stripRSAKeyHeaderAndFooter(keyPair.private)!) as ArrayBuffer
        ),
        algorithm as RsaKeyAlgorithm,
        extractable,
        ['decrypt']
      );

      return {
        publicKey,
        privateKey,
      };
    }

    if (algorithm.name === 'AES-CBC') {
      const nativeKey = await RSA.generateKeys(
        (algorithm as AesKeyGenParams).length
      );
      const nativeRawKey = new Uint8Array(b642ab(nativeKey.private));
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
  algorithm: RsaKeyAlgorithm | AesKeyAlgorithm,
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
