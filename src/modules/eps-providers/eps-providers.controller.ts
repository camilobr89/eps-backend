import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { EpsProvidersService } from './eps-providers.service';

@Controller('eps-providers')
export class EpsProvidersController {
  constructor(private readonly epsProvidersService: EpsProvidersService) {}

  @Get()
  findAll() {
    return this.epsProvidersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.epsProvidersService.findOne(id);
  }
}