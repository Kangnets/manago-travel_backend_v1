import {
  Controller,
  ForbiddenException,
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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductCategory } from './entities/product.entity';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';

/** 직원 계정은 agencyOwnerId, 오너는 자신의 id가 agencyId */
function getEffectiveAgencyId(user: any): string {
  if (!user || user.userType !== 'agency') {
    throw new ForbiddenException('여행사 계정만 이용할 수 있습니다.');
  }
  return user.agencyOwnerId || user.id;
}

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(AuthenticatedGuard)
  create(@Req() req: any, @Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto, getEffectiveAgencyId(req.user));
  }

  // 여행사 전용 엔드포인트
  @Get('agency/my')
  @UseGuards(AuthenticatedGuard)
  findMyProducts(
    @Req() req: any,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findByAgency(getEffectiveAgencyId(req.user), {
      category,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('agency/stats')
  @UseGuards(AuthenticatedGuard)
  getMyProductStats(@Req() req: any) {
    return this.productsService.getAgencyProductStats(getEffectiveAgencyId(req.user));
  }

  @Patch('agency/:id')
  @UseGuards(AuthenticatedGuard)
  updateMyProduct(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.updateByAgency(id, getEffectiveAgencyId(req.user), updateProductDto);
  }

  @Delete('agency/:id')
  @UseGuards(AuthenticatedGuard)
  removeMyProduct(@Req() req: any, @Param('id') id: string) {
    return this.productsService.removeByAgency(id, getEffectiveAgencyId(req.user));
  }

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('agencyId') agencyId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAll(
      category,
      location,
      agencyId,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get('recent')
  findRecent(@Query('limit') limit?: string) {
    return this.productsService.findRecent(limit ? parseInt(limit) : 4);
  }

  @Get('discounted')
  findDiscounted(@Query('limit') limit?: string) {
    return this.productsService.findDiscounted(limit ? parseInt(limit) : 3);
  }

  @Get('best/golf')
  findBestGolf(@Query('limit') limit?: string) {
    return this.productsService.findBestByCategory(
      ProductCategory.GOLF,
      limit ? parseInt(limit) : 5,
    );
  }

  @Get('best/tour')
  findBestTour(@Query('limit') limit?: string) {
    return this.productsService.findBestByCategory(
      ProductCategory.TOUR,
      limit ? parseInt(limit) : 5,
    );
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.productsService.search(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id/deactivate')
  @UseGuards(AuthenticatedGuard)
  softRemove(@Req() req: any, @Param('id') id: string) {
    return this.productsService.updateByAgency(id, getEffectiveAgencyId(req.user), { isActive: false });
  }
}
