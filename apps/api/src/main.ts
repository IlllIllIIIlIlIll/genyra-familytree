import { NestFactory } from '@nestjs/core'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import fastifyCookie from '@fastify/cookie'
import { AppModule } from './app.module'

/** Comma-separated list of allowed frontend origins, trailing slashes stripped. */
function parseAllowedOrigins(): string[] {
  const raw = process.env['FRONTEND_URL'] ?? 'http://localhost:3000'
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

async function bootstrap(): Promise<void> {
  const cookieSecret = process.env['JWT_ACCESS_SECRET']
  if (!cookieSecret) throw new Error('JWT_ACCESS_SECRET is not configured')

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  )

  await app.register(fastifyCookie, { secret: cookieSecret })

  const allowedOrigins = parseAllowedOrigins()

  app.enableCors({
    origin:  allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })

  // Swagger exposes the full API surface (every route, DTO shape) with no
  // auth — fine as a local dev aid, not fine sitting open on a public prod URL.
  if (process.env['NODE_ENV'] !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Genyra API')
      .setDescription('Family genealogy platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build()

    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api', app, document)
  }

  const port = process.env['PORT'] ?? 3001
  await app.listen(port, '0.0.0.0')
  console.log(`Genyra API running on http://localhost:${port}`)
  if (process.env['NODE_ENV'] !== 'production') {
    console.log(`Swagger docs at http://localhost:${port}/api`)
  }
}

void bootstrap()
