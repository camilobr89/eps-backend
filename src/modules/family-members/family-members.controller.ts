import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    ParseUUIDPipe,
  } from '@nestjs/common';
  import { FamilyMembersService } from './family-members.service';
  import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
  import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';
  import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
  import { CurrentUser } from '../../common/decorators/current-user.decorator';
  
  @Controller('family-members')
  @UseGuards(JwtAuthGuard)
  export class FamilyMembersController {
    constructor(private readonly familyMembersService: FamilyMembersService) {}
  
    @Post()
    create(
      @CurrentUser() user: { id: string },
      @Body() dto: CreateFamilyMemberDto,
    ) {
      return this.familyMembersService.create(user.id, dto);
    }
  
    @Get()
    findAll(@CurrentUser() user: { id: string }) {
      return this.familyMembersService.findAll(user.id);
    }
  
    @Get(':id')
    findOne(
      @Param('id', ParseUUIDPipe) id: string,
      @CurrentUser() user: { id: string },
    ) {
      return this.familyMembersService.findOne(id, user.id);
    }
  
    @Put(':id')
    update(
      @Param('id', ParseUUIDPipe) id: string,
      @CurrentUser() user: { id: string },
      @Body() dto: UpdateFamilyMemberDto,
    ) {
      return this.familyMembersService.update(id, user.id, dto);
    }
  
    @Delete(':id')
    remove(
      @Param('id', ParseUUIDPipe) id: string,
      @CurrentUser() user: { id: string },
    ) {
      return this.familyMembersService.remove(id, user.id);
    }
  }