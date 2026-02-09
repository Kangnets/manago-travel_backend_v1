import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async create(createReviewDto: CreateReviewDto): Promise<Review> {
    const review = this.reviewRepository.create(createReviewDto);
    return await this.reviewRepository.save(review);
  }

  async findAll(limit?: number): Promise<Review[]> {
    const query = this.reviewRepository.createQueryBuilder('review')
      .where('review.isActive = :isActive', { isActive: true })
      .orderBy('review.createdAt', 'DESC');

    if (limit) {
      query.take(limit);
    }

    return await query.getMany();
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({ 
      where: { id, isActive: true } 
    });
    
    if (!review) {
      throw new NotFoundException(`Review with ID "${id}" not found`);
    }
    
    return review;
  }

  async findByProductId(productId: string): Promise<Review[]> {
    return await this.reviewRepository.find({
      where: { productId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateReviewDto: UpdateReviewDto): Promise<Review> {
    const review = await this.findOne(id);
    Object.assign(review, updateReviewDto);
    return await this.reviewRepository.save(review);
  }

  async remove(id: string): Promise<void> {
    const review = await this.findOne(id);
    await this.reviewRepository.remove(review);
  }

  async softRemove(id: string): Promise<Review> {
    const review = await this.findOne(id);
    review.isActive = false;
    return await this.reviewRepository.save(review);
  }
}
