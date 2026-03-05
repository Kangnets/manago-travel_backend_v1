import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductCategory } from '../entities/product.entity';

export class ItineraryDayDto {
  @IsNumber()
  day: number;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  meals?: string;
}

export class CreateProductDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  location: string;

  @IsString()
  country: string;

  @IsString()
  duration: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rating?: number;

  @IsString()
  imageUrl: string;

  @IsEnum(ProductCategory)
  category: ProductCategory;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minParticipants?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxParticipants?: number;

  // 상세 예약 정보 (선택)
  @IsOptional()
  @IsDateString()
  departureDate?: string;

  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @IsOptional()
  @IsString()
  departureInfo?: string;

  @IsOptional()
  @IsString()
  returnInfo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceChild?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceInfant?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  blockSeats?: number;

  @IsOptional()
  @IsString()
  inquiryPhone?: string;

  @IsOptional()
  @IsString()
  inquiryFax?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItineraryDayDto)
  itinerary?: ItineraryDayDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  included?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excluded?: string[];

  @IsOptional()
  @IsString()
  cancelPolicy?: string;
}
