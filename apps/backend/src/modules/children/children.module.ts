import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ChildrenService } from './children.service';
import {
  CreateChildDto,
  SetChildPhotoDto,
  SetChildSnsDto,
  SetFamilyRegionDto,
} from './dto/children.dto';
import { CurrentUser, Roles } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';

@ApiTags('children')
@ApiBearerAuth()
@Controller('children')
@Roles(Role.PARENT)
class ChildrenController {
  constructor(private readonly children: ChildrenService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateChildDto) {
    return this.children.create(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.children.listForUser(user.userId);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.children.getOne(user.userId, id);
  }

  @Post(':id/photo')
  setPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetChildPhotoDto,
  ) {
    return this.children.setPhoto(user.userId, id, dto.photoUrl);
  }

  @Post(':id/sns')
  setSns(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetChildSnsDto,
  ) {
    return this.children.setSns(user.userId, id, dto.snsNumber);
  }
}

// The Family aggregate is owned by the children module (families are created
// lazily when the first child is registered), so its self-service endpoints
// live here too.
@ApiTags('families')
@ApiBearerAuth()
@Controller('families')
@Roles(Role.PARENT)
class FamiliesController {
  constructor(private readonly children: ChildrenService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.children.getFamilyForUser(user.userId);
  }

  @Post('me/region')
  setRegion(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetFamilyRegionDto) {
    return this.children.setFamilyRegion(user.userId, dto.region, dto.postalCode);
  }
}

@Module({
  controllers: [ChildrenController, FamiliesController],
  providers: [ChildrenService],
  exports: [ChildrenService],
})
export class ChildrenModule {}
