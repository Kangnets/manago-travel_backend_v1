import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  create(@Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(createReviewDto);
  }

  @Get()
  findAll(@Query('limit') limit?: string) {
    return this.reviewsService.findAll(limit ? parseInt(limit) : undefined);
  }

  /** 여행사 전용: 내 상품에 달린 리뷰 목록 */
  @Get('agency/my')
  @UseGuards(AuthenticatedGuard)
  findMyProductReviews(
    @Req() req: any,
    @Query('limit') limit?: string,
  ) {
    if (req.user?.userType !== 'agency') {
      return [];
    }
    return this.reviewsService.findByAgency(
      req.user.id,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get('product/:productId')
  findByProductId(@Param('productId') productId: string) {
    return this.reviewsService.findByProductId(productId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
    return this.reviewsService.update(id, updateReviewDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }

  /** 여행사 전용: 리뷰 비공개 처리 (더 구체적 라우트를 위에) */
  @Patch('agency/:id/deactivate')
  @UseGuards(AuthenticatedGuard)
  async agencySoftRemove(@Req() req: any, @Param('id') id: string) {
    if (req.user?.userType !== 'agency') {
      return this.reviewsService.softRemove(id);
    }
    return this.reviewsService.softRemove(id);
  }

  @Patch(':id/deactivate')
  softRemove(@Param('id') id: string) {
    return this.reviewsService.softRemove(id);
  }
}
