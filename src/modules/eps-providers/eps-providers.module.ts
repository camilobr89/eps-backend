import { Module } from '@nestjs/common';
import { EpsProvidersController } from './eps-providers.controller';
import { EpsProvidersService } from './eps-providers.service';

@Module({
  controllers: [EpsProvidersController],
  providers: [EpsProvidersService],
})
export class EpsProvidersModule {}