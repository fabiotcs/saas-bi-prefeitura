import { NextResponse } from 'next/server'

/**
 * Swagger/OpenAPI docs redirect — returns basic API documentation as JSON
 * In production, this could be replaced with next-swagger-doc or swagger-ui-react
 */
export async function GET() {
  const openApiSpec = {
    openapi: '3.0.0',
    info: {
      title: 'SaaS BI Prefeitura API',
      version: '1.0.0',
      description: 'API pública para integração com o sistema de gestão municipal',
    },
    servers: [{ url: '/api', description: 'API Server' }],
    paths: {
      '/establishments': {
        get: {
          summary: 'Listar estabelecimentos',
          tags: ['Estabelecimentos'],
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'city', in: 'query', schema: { type: 'string' } },
            { name: 'state', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Lista de estabelecimentos' },
            '401': { description: 'Não autenticado' },
          },
        },
      },
      '/dashboard': {
        get: {
          summary: 'Dados do dashboard',
          tags: ['Dashboard'],
          responses: {
            '200': { description: 'KPIs e resumos do dashboard' },
            '401': { description: 'Não autenticado' },
          },
        },
      },
      '/bi/data': {
        get: {
          summary: 'Dados de BI',
          tags: ['Business Intelligence'],
          parameters: [
            { name: 'period', in: 'query', schema: { type: 'string', enum: ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] } },
          ],
          responses: {
            '200': { description: 'Dados de BI para o período selecionado' },
            '401': { description: 'Não autenticado' },
          },
        },
      },
      '/integrations/api-keys': {
        get: {
          summary: 'Listar API Keys',
          tags: ['Integrações'],
          responses: {
            '200': { description: 'Lista de API Keys' },
            '401': { description: 'Não autenticado' },
          },
        },
        post: {
          summary: 'Criar API Key',
          tags: ['Integrações'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    permissions: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['name'],
                },
              },
            },
          },
          responses: {
            '201': { description: 'API Key criada (rawKey retornado apenas nesta resposta)' },
            '401': { description: 'Não autenticado' },
            '422': { description: 'Dados inválidos' },
          },
        },
      },
    },
  }

  return NextResponse.json(openApiSpec)
}
