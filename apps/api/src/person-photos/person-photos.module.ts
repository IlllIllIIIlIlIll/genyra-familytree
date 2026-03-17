import { Module } from '@nestjs/common'
import { PersonPhotosController } from './person-photos.controller'
import { PersonPhotosService } from './person-photos.service'

@Module({
  controllers: [PersonPhotosController],
  providers: [PersonPhotosService],
  exports: [PersonPhotosService],
})
export class PersonPhotosModule {}
