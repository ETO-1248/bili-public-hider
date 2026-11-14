/* BiliPublicHider — 设置密码的哈希工具
 * PBKDF2-SHA-256，随机盐；只保存派生结果，不保存明文。
 * 该文件不联网，也不读取页面内容。
 */
(() => {
  'use strict';

  const ITERATIONS = 210000;
  const SALT_BYTES = 16;
  const HASH_BITS = 256;

  function bytesToBase64(bytes) {
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  function isValid(record) {
    return Boolean(
      record &&
      record.v === 1 &&
      record.alg === 'PBKDF2-SHA-256' &&
      Number.isInteger(record.iterations) &&
      record.iterations >= 50000 &&
      record.iterations <= 1000000 &&
      typeof record.salt === 'string' &&
      record.salt.length > 0 &&
      typeof record.hash === 'string' &&
      record.hash.length > 0
    );
  }

  async function derive(password, salt, iterations) {
    if (!globalThis.crypto || !crypto.subtle) {
      throw new Error('当前浏览器不支持密码加密功能。');
    }
    const material = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256'
      },
      material,
      HASH_BITS
    );
    return new Uint8Array(bits);
  }

  async function create(password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const hash = await derive(password, salt, ITERATIONS);
    return {
      v: 1,
      alg: 'PBKDF2-SHA-256',
      iterations: ITERATIONS,
      salt: bytesToBase64(salt),
      hash: bytesToBase64(hash)
    };
  }

  async function verify(password, record) {
    if (!isValid(record)) {
      throw new Error('密码数据无效，请移除并重新安装扩展。');
    }
    const salt = base64ToBytes(record.salt);
    const expected = base64ToBytes(record.hash);
    const actual = await derive(password, salt, record.iterations);
    if (actual.length !== expected.length) return false;

    let difference = 0;
    for (let index = 0; index < actual.length; index += 1) {
      difference |= actual[index] ^ expected[index];
    }
    return difference === 0;
  }

  globalThis.BPHPassword = Object.freeze({
    isValid,
    create,
    verify
  });
})();
