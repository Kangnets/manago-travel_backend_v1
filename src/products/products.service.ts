import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PocketBaseService } from '../pocketbase/pocketbase.service';
import { Product, ProductCategory } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const COLLECTION = 'products';

function mapRecordToProduct(record: any): Product {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    location: record.location,
    country: record.country,
    duration: record.duration,
    price: Number(record.price),
    originalPrice: record.originalPrice != null ? Number(record.originalPrice) : undefined,
    rating: record.rating != null ? Number(record.rating) : undefined,
    imageUrl: record.imageUrl,
    category: record.category || 'tour',
    isActive: record.isActive ?? true,
    isFeatured: record.isFeatured ?? false,
    viewCount: record.viewCount ?? 0,
    agencyId: record.agencyId,
    minParticipants: record.minParticipants ?? 1,
    maxParticipants: record.maxParticipants ?? 20,
    created: record.created,
    updated: record.updated,
  };
}

@Injectable()
export class ProductsService {
  constructor(private readonly pb: PocketBaseService) {}

  async create(createProductDto: CreateProductDto, agencyId?: string): Promise<Product> {
    const raw: Record<string, unknown> = {
      title: createProductDto.title,
      description: createProductDto.description ?? '',
      location: createProductDto.location,
      country: createProductDto.country,
      duration: createProductDto.duration,
      price: createProductDto.price,
      imageUrl: createProductDto.imageUrl,
      category: createProductDto.category,
      agencyId: agencyId ?? null,
      isActive: createProductDto.isActive ?? true,
      isFeatured: createProductDto.isFeatured ?? false,
      viewCount: 0,
      minParticipants: createProductDto.minParticipants ?? 1,
      maxParticipants:
        createProductDto.blockSeats ??
        createProductDto.maxParticipants ??
        20,
    };
    if (createProductDto.originalPrice != null) raw.originalPrice = createProductDto.originalPrice;
    const payload = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== undefined),
    ) as Record<string, unknown>;
    const record = await this.pb.collection(COLLECTION).create(payload);
    return mapRecordToProduct(record);
  }

  async findAll(category?: string, location?: string, limit?: number): Promise<Product[]> {
    let filter = 'isActive = true';
    if (category) filter += ` && category = "${category}"`;
    if (location) filter += ` && location = "${location.replace(/"/g, '\\"')}"`;
    const list = await this.pb.collection(COLLECTION).getList(1, limit || 500, {
      filter,
      sort: '-created',
    });
    return list.items.map((r: any) => mapRecordToProduct(r));
  }

  async findOne(id: string): Promise<Product> {
    const record = await this.pb.collection(COLLECTION).getOne(id).catch(() => null);
    if (!record) throw new NotFoundException(`Product with ID "${id}" not found`);
    const product = mapRecordToProduct(record);
    await this.pb.collection(COLLECTION).update(id, { viewCount: (record.viewCount || 0) + 1 });
    product.viewCount = (record.viewCount || 0) + 1;
    return product;
  }

  async findRecent(limit: number = 4): Promise<Product[]> {
    const list = await this.pb.collection(COLLECTION).getList(1, limit, {
      filter: 'isActive = true',
      sort: '-created',
    });
    return list.items.map((r: any) => mapRecordToProduct(r));
  }

  async findDiscounted(limit: number = 3): Promise<Product[]> {
    const list = await this.pb.collection(COLLECTION).getFullList({
      filter: 'isActive = true && originalPrice != "" && originalPrice > price',
      sort: '-created',
    });
    const sorted = list
      .map((r: any) => mapRecordToProduct(r))
      .sort((a, b) => {
        const aRate = a.originalPrice ? (a.originalPrice - a.price) / a.originalPrice : 0;
        const bRate = b.originalPrice ? (b.originalPrice - b.price) / b.originalPrice : 0;
        return bRate - aRate;
      });
    return sorted.slice(0, limit);
  }

  async findBestByCategory(category: ProductCategory, limit: number = 5): Promise<Product[]> {
    const list = await this.pb.collection(COLLECTION).getList(1, limit, {
      filter: `category = "${category}" && isActive = true && isFeatured = true`,
      sort: '-rating,-viewCount',
    });
    return list.items.map((r: any) => mapRecordToProduct(r));
  }

  async search(query: string): Promise<Product[]> {
    const q = query.replace(/"/g, '\\"');
    const list = await this.pb.collection(COLLECTION).getFullList({
      filter: `isActive = true && (title ~ "${q}" || location ~ "${q}" || country ~ "${q}" || description ~ "${q}")`,
      sort: '-created',
    });
    return list.map((r: any) => mapRecordToProduct(r));
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    await this.findOne(id);
    const record = await this.pb.collection(COLLECTION).update(id, updateProductDto);
    return mapRecordToProduct(record);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.pb.collection(COLLECTION).delete(id);
  }

  async softRemove(id: string): Promise<Product> {
    const product = await this.findOne(id);
    await this.pb.collection(COLLECTION).update(id, { isActive: false });
    return { ...product, isActive: false };
  }

  async findByAgency(
    agencyId: string,
    query: {
      category?: string;
      isActive?: boolean;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const { category, isActive, page = 1, limit = 20 } = query;
    let filter = `agencyId = "${agencyId}"`;
    if (category) filter += ` && category = "${category}"`;
    if (isActive !== undefined) filter += ` && isActive = ${isActive}`;

    const list = await this.pb.collection(COLLECTION).getList(page, limit, {
      filter,
      sort: '-created',
    });
    return {
      data: list.items.map((r: any) => mapRecordToProduct(r)),
      total: list.totalItems,
      page,
      limit,
    };
  }

  async updateByAgency(
    id: string,
    agencyId: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const record = await this.pb.collection(COLLECTION).getOne(id).catch(() => null);
    if (!record) throw new NotFoundException(`상품을 찾을 수 없습니다. (ID: ${id})`);
    if (record.agencyId !== agencyId) throw new ForbiddenException('이 상품에 대한 수정 권한이 없습니다.');
    const updated = await this.pb.collection(COLLECTION).update(id, updateProductDto);
    return mapRecordToProduct(updated);
  }

  async removeByAgency(id: string, agencyId: string): Promise<void> {
    const record = await this.pb.collection(COLLECTION).getOne(id).catch(() => null);
    if (!record) throw new NotFoundException(`상품을 찾을 수 없습니다. (ID: ${id})`);
    if (record.agencyId !== agencyId) throw new ForbiddenException('이 상품에 대한 삭제 권한이 없습니다.');
    await this.pb.collection(COLLECTION).delete(id);
  }

  async getAgencyProductStats(agencyId: string): Promise<{
    totalProducts: number;
    activeProducts: number;
    categoryBreakdown: { category: string; count: number }[];
  }> {
    const all = await this.pb.collection(COLLECTION).getFullList({
      filter: `agencyId = "${agencyId}"`,
    });
    const totalProducts = all.length;
    const activeProducts = all.filter((r: any) => r.isActive !== false).length;
    const byCategory: Record<string, number> = {};
    all.forEach((r: any) => {
      const c = r.category || 'tour';
      byCategory[c] = (byCategory[c] || 0) + 1;
    });
    const categoryBreakdown = Object.entries(byCategory).map(([category, count]) => ({
      category,
      count,
    }));
    return { totalProducts, activeProducts, categoryBreakdown };
  }
}
