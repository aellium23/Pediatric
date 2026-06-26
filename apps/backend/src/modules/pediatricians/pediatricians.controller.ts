import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PediatriciansService } from './pediatricians.service';
import { ReviewsService } from './reviews.service';
import { FavoritesService } from './favorites.service';
import { CurrentUser, Public, Roles } from '../../common/security/decorators';
import { AuthenticatedUser } from '../../common/security/jwt.strategy';
import {
  ConnectOnboardingDto,
  CreateReviewDto,
  CreateServiceDto,
  MarketplaceQueryDto,
  SubmitDocumentDto,
  UpdateProfileDto,
  UpdateServiceDto,
} from './dto/pediatricians.dto';

@ApiTags('pediatricians')
@ApiBearerAuth()
@Controller('pediatricians')
export class PediatriciansController {
  constructor(
    private readonly service: PediatriciansService,
    private readonly reviews: ReviewsService,
    private readonly favorites: FavoritesService,
  ) {}

  // ── Marketplace (public directory — SEO-friendly) ──
  @Public()
  @Get()
  list(@Query() q: MarketplaceQueryDto) {
    return this.service.listMarketplace(q);
  }

  // ── Favourites (parent) — declared before :id to avoid route clash ──
  @Get('favorites')
  @Roles(Role.PARENT)
  listFavorites(@CurrentUser() user: AuthenticatedUser) {
    return this.favorites.list(user.userId);
  }

  @Post(':id/favorite')
  @Roles(Role.PARENT)
  addFavorite(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.favorites.add(user.userId, id);
  }

  @Delete(':id/favorite')
  @Roles(Role.PARENT)
  removeFavorite(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.favorites.remove(user.userId, id);
  }

  // ── Pediatrician self-management ──
  @Get('me')
  @Roles(Role.PEDIATRICIAN)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getMe(user.userId);
  }

  @Patch('me')
  @Roles(Role.PEDIATRICIAN)
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.service.updateMe(user.userId, dto);
  }

  @Get('me/finance')
  @Roles(Role.PEDIATRICIAN)
  finance(@CurrentUser() user: AuthenticatedUser) {
    return this.service.finance(user.userId);
  }

  @Post('me/services')
  @Roles(Role.PEDIATRICIAN)
  createService(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateServiceDto) {
    return this.service.createService(user.userId, dto);
  }

  @Patch('me/services/:id')
  @Roles(Role.PEDIATRICIAN)
  updateService(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.service.updateService(user.userId, id, dto);
  }

  @Delete('me/services/:id')
  @Roles(Role.PEDIATRICIAN)
  deactivateService(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.deactivateService(user.userId, id);
  }

  @Post('me/connect')
  @Roles(Role.PEDIATRICIAN)
  connect(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConnectOnboardingDto,
  ) {
    return this.service.createConnectOnboarding(user.userId, dto.returnUrl ?? 'https://pedia.app');
  }

  // ── Credential documents (compliance verification) ──
  @Get('me/documents')
  @Roles(Role.PEDIATRICIAN)
  listMyDocuments(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMyDocuments(user.userId);
  }

  @Post('me/documents')
  @Roles(Role.PEDIATRICIAN)
  submitDocument(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitDocumentDto) {
    return this.service.submitDocument(user.userId, dto);
  }

  // ── Reviews ──
  @Post('reviews')
  @Roles(Role.PARENT)
  createReview(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user.userId, dto);
  }

  @Public()
  @Get(':id/reviews')
  listReviews(@Param('id') id: string) {
    return this.reviews.listForPediatrician(id);
  }

  // ── Public profile (keep last: avoid clashing with /me, /reviews) ──
  @Public()
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getPublic(id);
  }
}
