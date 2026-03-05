import { Injectable, NotFoundException } from '@nestjs/common';
import { PocketBaseService } from '../pocketbase/pocketbase.service';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

const COLLECTION = 'reviews';

function mapRecordToReview(record: any): Review {
  return {
    id: record.id,
    productId: record.productId,
    productTitle: record.productTitle,
    rating: Number(record.rating),
    comment: record.comment,
    images: record.images || [],
    userName: record.userName,
    isActive: record.isActive ?? true,
    created: record.created,
    updated: record.updated,
  };
}

@Injectable()
export class ReviewsService {
  constructor(private readonly pb: PocketBaseService) {}

  async create(createReviewDto: CreateReviewDto): Promise<Review> {
    const record = await this.pb.collection(COLLECTION).create(createReviewDto);
    return mapRecordToReview(record);
  }

  async findAll(limit?: number): Promise<Review[]> {
    try {
      const list = await this.pb.collection(COLLECTION).getList(1, limit || 500, {
        filter: 'isActive = true',
        sort: '-created',
      });
      return list.items.map((r: any) => mapRecordToReview(r));
    } catch (e: any) {
      if (e?.status === 404) return [];
      throw e;
    }
  }

  async findOne(id: string): Promise<Review> {
    const record = await this.pb.collection(COLLECTION).getOne(id).catch(() => null);
    if (!record || record.isActive === false)
      throw new NotFoundException(`Review with ID "${id}" not found`);
    return mapRecordToReview(record);
  }

  async findByProductId(productId: string): Promise<Review[]> {
    try {
      const list = await this.pb.collection(COLLECTION).getFullList({
        filter: `productId = "${productId}" && isActive = true`,
        sort: '-created',
      });
      return list.map((r: any) => mapRecordToReview(r));
    } catch (e: any) {
      if (e?.status === 404) return [];
      throw e;
    }
  }

  async update(id: string, updateReviewDto: UpdateReviewDto): Promise<Review> {
    await this.findOne(id);
    const record = await this.pb.collection(COLLECTION).update(id, updateReviewDto);
    return mapRecordToReview(record);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.pb.collection(COLLECTION).delete(id);
  }

  async softRemove(id: string): Promise<Review> {
    const review = await this.findOne(id);
    await this.pb.collection(COLLECTION).update(id, { isActive: false });
    return { ...review, isActive: false };
  }

  /** 여행사가 등록한 상품에 달린 리뷰 목록 */
  async findByAgency(agencyId: string, limit?: number): Promise<Review[]> {
    try {
      const products = await this.pb.collection('products').getFullList({
        filter: `agencyId = "${agencyId}"`,
        fields: 'id',
      });
      const productIds = products.map((p: any) => p.id);
      if (productIds.length === 0) return [];
      const filter = productIds.map((id: string) => `productId = "${id}"`).join(' || ');
      const list = await this.pb.collection(COLLECTION).getList(1, limit || 200, {
        filter: `(${filter})`,
        sort: '-created',
      });
      return list.items.map((r: any) => mapRecordToReview(r));
    } catch (e: any) {
      if (e?.status === 404) return [];
      throw e;
    }
  }
}
