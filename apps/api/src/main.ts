import { NestFactory } from '@nestjs/core'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import fastifyMultipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  )

  // Ensure upload directories exist
  mkdirSync(join(process.cwd(), 'uploads', 'avatars'), { recursive: true })
  mkdirSync(join(process.cwd(), 'uploads', 'photos'), { recursive: true })

  // Register multipart support for file uploads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(fastifyMultipart as any, {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  })

  // Serve uploaded files as static assets
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(fastifyStatic as any, {
    root: join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    decorateReply: false,
  })

  app.enableCors({
    origin:  process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })

  const config = new DocumentBuilder()
    .setTitle('Genyra API')
    .setDescription('Family genealogy platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, document)

  const port = process.env['PORT'] ?? 3001
  await app.listen(port, '0.0.0.0')
  console.log(`Genyra API running on http://localhost:${port}`)
  console.log(`Swagger docs at http://localhost:${port}/api`)
}

void bootstrap()
