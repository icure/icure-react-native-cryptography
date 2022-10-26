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

import { atob, btoa } from 'react-native-quick-base64';

export const ua2string = (_ua: Uint8Array | ArrayBuffer): string => {
  let str = '';
  const ab = new Uint8Array(_ua);
  const abLen = ab.length;
  const CHUNK_SIZE = Math.pow(2, 8);
  let offset, len, subab;
  for (offset = 0; offset < abLen; offset += CHUNK_SIZE) {
    len = Math.min(CHUNK_SIZE, abLen - offset);
    subab = ab.subarray(offset, offset + len);
    str += String.fromCharCode.apply(null, subab as any);
  }
  return str;
};

export const string2ua = (s: string): Uint8Array => {
  const ua = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    ua[i] = s.charCodeAt(i) & 0xff;
  }
  return ua;
};

export const string2ab = (s: string): ArrayBuffer => {
  return ua2ab(string2ua(s));
};

export const b2a = (a: string): string => {
  return btoa(a);
};

export const a2b = (s: string): string => {
  return atob(s);
};

export const ua2ab = (ua: Uint8Array): ArrayBuffer => {
  const buffer = ua.buffer;
  return (
    buffer.byteLength > ua.byteLength ? buffer.slice(0, ua.byteLength) : buffer
  ) as ArrayBuffer;
};

export const b642ab = (s: string): ArrayBuffer => {
  return ua2ab(string2ua(a2b(s)));
};

export const b642ua = (s: string): Uint8Array => {
  return string2ua(a2b(s));
};

export const ua2b64 = (_ua: Uint8Array | ArrayBuffer): string => {
  return b2a(ua2string(_ua));
};

export const ua2b64Url = (_ua: Uint8Array | ArrayBuffer): string => {
  return b2a(ua2string(_ua))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/[=]/g, '');
};

export const b64Url2ua = (ua: string): ArrayBuffer => {
  return b642ua(
    ua.replace(/-/g, '+').replace(/_/g, '/').replace(/[=]/g, '') +
      (ua.length % 4 === 3 ? '=' : ua.length % 4 === 2 ? '==' : '')
  );
};

export const hex2ua = (s: string): Uint8Array => {
  const ua = new Uint8Array(s.length / 2);
  s = s.toLowerCase();
  for (let i = 0; i < s.length; i += 2) {
    ua[i / 2] =
      (s.charCodeAt(i) < 58 ? s.charCodeAt(i) - 48 : s.charCodeAt(i) - 87) *
        16 +
      (s.charCodeAt(i + 1) < 58
        ? s.charCodeAt(i + 1) - 48
        : s.charCodeAt(i + 1) - 87);
  }
  return ua;
};

/**
 * Uint8Array/ArrayBuffer to hex String
 *
 * @param _ua {Uint8Array} or ArrayBuffer
 * @returns {String} Hex String
 */
export const ua2hex = (_ua: Uint8Array | ArrayBuffer): string => {
  let s = '';
  const ua = new Uint8Array(_ua);
  for (let i = 0; i < ua.length; i++) {
    const hhb = (ua[i]!! & 0xf0) >> 4;
    const lhb = ua[i]!! & 0x0f;
    s += String.fromCharCode(hhb > 9 ? hhb + 87 : hhb + 48);
    s += String.fromCharCode(lhb > 9 ? lhb + 87 : lhb + 48);
  }

  return s;
};
