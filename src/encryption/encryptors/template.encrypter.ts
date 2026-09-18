export abstract class Encrypter {
  abstract readonly name: string;
  /** Higher wins: the encrypter with the highest level is used for new hashes. */
  abstract readonly securityLevel: number;

  abstract encrypt(plainText: string): Promise<string>;
  abstract compare(plainText: string, hash: string): Promise<boolean>;
}
