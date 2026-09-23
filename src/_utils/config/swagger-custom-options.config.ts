import type { SwaggerCustomOptions } from '@nestjs/swagger';

const swaggerCustomOptions: SwaggerCustomOptions = {
  jsonDocumentUrl: 'api/doc/json',
  yamlDocumentUrl: 'api/doc/yaml',
  swaggerOptions: {
    persistAuthorization: true,
    tryItOutEnabled: true,
    displayRequestDuration: true,
    filter: true,
    operationsSorter: (a: any, b: any) => {
      const order: Record<string, string> = {
        get: '0',
        post: '1',
        patch: '2',
        put: '3',
        delete: '4',
        head: '5',
        options: '6',
        connect: '7',
        trace: '8',
      };
      return (
        order[a.get('method')].localeCompare(order[b.get('method')]) ||
        a.get('path').localeCompare(b.get('path'))
      );
    },
    tagsSorter: 'alpha',
  },
};

export default swaggerCustomOptions;
