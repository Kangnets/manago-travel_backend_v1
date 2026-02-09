import { IsString, IsNumber, IsArray, IsOptional, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  productId: string;

  @IsString()
  productTitle: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number;

  @IsString()
  comment: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  userName?: string;
}
