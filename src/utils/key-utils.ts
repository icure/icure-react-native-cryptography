/*
 * Copyright 2018 Taktik sa
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
 * LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { pack } from './asn1-packer';
import { parseAsn1 } from './asn1-parser';
import { b64Url2ua, hex2ua, ua2b64, ua2b64Url, ua2hex } from './binary-utils';

export const jwk2pkcs8 = (jwk: any): string => {
  return pack([
    0x30,
    [
      [0x02, '00'],
      [0x30, [[0x06, '2a864886f70d010101'], [0x05]]], // pragma: allowlist secret
      [
        0x04,
        [
          [
            0x30,
            [
              [0x02, '00'],
              [0x02, ua2hex(b64Url2ua(jwk.n))],
              [0x02, ua2hex(b64Url2ua(jwk.e))],
              [0x02, ua2hex(b64Url2ua(jwk.d))],
              [0x02, ua2hex(b64Url2ua(jwk.p))],
              [0x02, ua2hex(b64Url2ua(jwk.q))],
              [0x02, ua2hex(b64Url2ua(jwk.dp))],
              [0x02, ua2hex(b64Url2ua(jwk.dq))],
              [0x02, ua2hex(b64Url2ua(jwk.qi))],
            ],
          ],
        ],
      ],
    ],
  ]);
};

export const jwk2pkcs1 = (jwk: any): string => {
  return pack([
    0x30,
    [
      [0x02, '00'],
      [0x02, ua2hex(b64Url2ua(jwk.n))],
      [0x02, ua2hex(b64Url2ua(jwk.e))],
      [0x02, ua2hex(b64Url2ua(jwk.d))],
      [0x02, ua2hex(b64Url2ua(jwk.p))],
      [0x02, ua2hex(b64Url2ua(jwk.q))],
      [0x02, ua2hex(b64Url2ua(jwk.dp))],
      [0x02, ua2hex(b64Url2ua(jwk.dq))],
      [0x02, ua2hex(b64Url2ua(jwk.qi))],
    ],
  ]);
};

export const jwk2spki = (jwk: any): string => {
  return pack([
    0x30,
    [
      [0x30, [[0x06, '2a864886f70d010101'], [0x05]]], // pragma: allowlist secret
      [
        0x03,
        [
          [
            0x30,
            [
              [0x02, ua2hex(b64Url2ua(jwk.n))],
              [0x02, ua2hex(b64Url2ua(jwk.e))],
            ],
          ],
        ],
      ],
    ],
  ]);
};

export const spkiToJwk = (
  buf: Uint8Array
): { kty: string; alg: string; n: string; e: string; ext: boolean } => {
  const asn1 = parseAsn1(new Uint8Array(buf));

  var modulus: Uint8Array | undefined = undefined;
  var exponent: Uint8Array | undefined = undefined;
  if (
    asn1.type === 0x30 &&
    asn1.children?.[0]?.type === 0x30 &&
    asn1.children?.[0]?.children?.[0]?.type === 0x06 &&
    ua2hex(asn1.children?.[0]?.children?.[0]?.value ?? new Uint8Array()) ===
      '2a864886f70d010101' // pragma: allowlist secret
  ) {
    modulus = asn1.children?.[1]?.children?.[0]?.children?.[0]?.value;
    exponent = asn1.children?.[1]?.children?.[0]?.children?.[1]?.value;
  } else if (
    asn1.type === 0x30 &&
    asn1.children?.[0]?.type === 0x02 &&
    asn1.children?.[1]?.type === 0x02
  ) {
    modulus = asn1.children?.[0]?.value;
    exponent = asn1.children?.[1]?.value;
  }

  if (!modulus || !exponent) {
    throw new Error('Invalid spki format');
  }
  return {
    kty: 'RSA',
    alg: 'RSA-OAEP',
    ext: true,
    n: ua2b64Url(minimalRep(modulus)),
    e: ua2b64Url(minimalRep(exponent)),
  };
};

export const pkcs8ToJwk = (buf: Uint8Array | ArrayBuffer) => {
  const parsed = parseAsn1(new Uint8Array(buf));
  const seq =
    parsed.children?.length === 3 &&
    parsed.children[2]!.type === 0x04 &&
    parsed.children[2]!.children?.length === 1
      ? parsed.children[2]!.children[0]
      : parsed;
  return {
    kty: 'RSA',
    n: ua2b64Url(minimalRep(seq!.children![1]!.value as Uint8Array)),
    e: ua2b64Url(minimalRep(seq!.children![2]!.value as Uint8Array)),
    d: ua2b64Url(minimalRep(seq!.children![3]!.value as Uint8Array)),
    p: ua2b64Url(minimalRep(seq!.children![4]!.value as Uint8Array)),
    q: ua2b64Url(minimalRep(seq!.children![5]!.value as Uint8Array)),
    dp: ua2b64Url(minimalRep(seq!.children![6]!.value as Uint8Array)),
    dq: ua2b64Url(minimalRep(seq!.children![7]!.value as Uint8Array)),
    qi: ua2b64Url(minimalRep(seq!.children![8]!.value as Uint8Array)),
  };
};

export const stringifyPublicJWK = (jwk: JsonWebKey): string => {
  return ua2b64(hex2ua(jwk2spki(jwk)));
};

export const stringifyPrivateJWK = (jwk: JsonWebKey): string => {
  return ua2b64(hex2ua(jwk2pkcs1(jwk)));
};

const minimalRep = (b: Uint8Array): Uint8Array => {
  let i = 0;
  while (b[i] === 0) {
    i++;
  }
  return b.slice(i);
};
