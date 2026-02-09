import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductCategory } from './entities/product.entity';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAll(
      category,
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Patch(':id/deactivate')
  softRemove(@Param('id') id: string) {
    return this.productsService.softRemove(id);
  }
}
