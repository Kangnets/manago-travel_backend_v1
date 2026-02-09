import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Product, ProductCategory } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create(createProductDto);
    return await this.productRepository.save(product);
  }

  async findAll(category?: string, limit?: number): Promise<Product[]> {
    const query = this.productRepository.createQueryBuilder('product')
      .where('product.isActive = :isActive', { isActive: true });

    if (category) {
      query.andWhere('product.category = :category', { category });
    }

    if (limit) {
      query.take(limit);
    }

    query.orderBy('product.createdAt', 'DESC');

    return await query.getMany();
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    // 조회수 증가
    product.viewCount += 1;
    await this.productRepository.save(product);

    return product;
  }

  async findRecent(limit: number = 4): Promise<Product[]> {
    return await this.productRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findDiscounted(limit: number = 3): Promise<Product[]> {
    return await this.productRepository
      .createQueryBuilder('product')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere('product.originalPrice IS NOT NULL')
      .andWhere('product.originalPrice > product.price')
      .orderBy('(product.originalPrice - product.price) / product.originalPrice', 'DESC')
      .take(limit)
      .getMany();
  }

  async findBestByCategory(category: ProductCategory, limit: number = 5): Promise<Product[]> {
    return await this.productRepository.find({
      where: { 
        category,
        isActive: true,
        isFeatured: true,
      },
      order: { 
        rating: 'DESC',
        viewCount: 'DESC',
      },
      take: limit,
    });
  }

  async search(query: string): Promise<Product[]> {
    return await this.productRepository.find({
      where: [
        { title: Like(`%${query}%`), isActive: true },
        { location: Like(`%${query}%`), isActive: true },
        { country: Like(`%${query}%`), isActive: true },
        { description: Like(`%${query}%`), isActive: true },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return await this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }

  async softRemove(id: string): Promise<Product> {
    const product = await this.findOne(id);
    product.isActive = false;
    return await this.productRepository.save(product);
  }
}
