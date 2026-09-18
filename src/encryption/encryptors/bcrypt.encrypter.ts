import bcrypt from 'bcrypt';
import { Encrypter } from './template.encrypter.js';

export class BcryptEncrypter extends Encrypter {
  readonly name = 'bcrypt';
  readonly securityLevel = 50;

  private readonly saltRounds = 10;

  encrypt = (plainText: string): Promise<string> =>
    bcrypt.hash(plainText, this.saltRounds);

  compare = (plainText: string, hash: string): Promise<boolean> =>
    bcrypt.compare(plainText, hash);
}
