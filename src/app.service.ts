import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor() {}

  healthCheck() {
    return {
      backend: 'healthy',
    };
  }
}
