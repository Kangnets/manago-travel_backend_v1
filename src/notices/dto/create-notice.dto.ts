import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { NoticeCategory } from '../entities/notice.entity';

export class CreateNoticeDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(NoticeCategory)
  category?: NoticeCategory;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
