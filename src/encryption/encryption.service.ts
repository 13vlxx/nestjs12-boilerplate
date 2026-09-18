import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Encrypter } from './encryptors/template.encrypter.js';
import { BcryptEncrypter } from './encryptors/bcrypt.encrypter.js';

export interface HashComparisonResult {
  isMatch: boolean;
  /** True when the hash was produced by an encrypter that is no longer the current one: re-hash it. */
  isEncryptionChanged: boolean;
}

/**
 * Hashes are stored as `{<encrypter name>}<hash>` so the algorithm can be
 * upgraded later: add a new Encrypter with a higher securityLevel, and old
 * hashes are transparently re-hashed on the next successful comparison.
 */
@Injectable()
export class EncryptionService {
  private readonly encryptors: Map<string, Encrypter>;
  private readonly currentEncrypter: Encrypter;

  constructor() {
    const encryptors: Encrypter[] = [new BcryptEncrypter()];

    const names = new Set(encryptors.map((e) => e.name));
    if (names.size < encryptors.length)
      throw new InternalServerErrorException(
        'Encrypter error: encryptors must have different names',
      );

    this.encryptors = new Map(encryptors.map((e) => [e.name, e]));
    this.currentEncrypter = encryptors.reduce((best, e) =>
      e.securityLevel > best.securityLevel ? e : best,
    );
  }

  async encrypt(plainText: string): Promise<string> {
    const hash = await this.currentEncrypter.encrypt(plainText);
    return `{${this.currentEncrypter.name}}${hash}`;
  }

  async compare(
    plainText: string,
    storedHash: string,
  ): Promise<HashComparisonResult> {
    const separator = storedHash.indexOf('}');
    if (storedHash.at(0) !== '{' || separator === -1)
      throw new InternalServerErrorException(
        'Encrypter error: hash syntax error',
      );

    const encrypterName = storedHash.substring(1, separator);
    const hash = storedHash.substring(separator + 1);

    const encrypter = this.encryptors.get(encrypterName);
    if (!encrypter)
      throw new InternalServerErrorException(
        `Encrypter error: unknown encrypter "${encrypterName}"`,
      );

    return {
      isMatch: await encrypter.compare(plainText, hash),
      isEncryptionChanged: encrypterName !== this.currentEncrypter.name,
    };
  }
}
