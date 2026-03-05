import { Injectable, NotFoundException } from '@nestjs/common';
import { PocketBaseService } from '../pocketbase/pocketbase.service';
import { Notice, NoticeCategory } from './entities/notice.entity';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';

const COLLECTION = 'notices';

function mapRecordToNotice(record: any): Notice {
  return {
    id: record.id,
    title: record.title,
    content: record.content,
    category: record.category || NoticeCategory.GENERAL,
    isPublished: record.isPublished ?? true,
    isPinned: record.isPinned ?? false,
    authorId: record.authorId,
    authorName: record.authorName,
    viewCount: Number(record.viewCount ?? 0),
    created: record.created,
    updated: record.updated,
  };
}

@Injectable()
export class NoticesService {
  constructor(private readonly pb: PocketBaseService) {}

  async create(authorId: string, createNoticeDto: CreateNoticeDto): Promise<Notice> {
    const record = await this.pb.collection(COLLECTION).create({
      ...createNoticeDto,
      authorId,
      category: createNoticeDto.category || NoticeCategory.GENERAL,
      isPublished: createNoticeDto.isPublished ?? true,
      isPinned: createNoticeDto.isPinned ?? false,
      viewCount: 0,
    });
    return mapRecordToNotice(record);
  }

  async findAll(params: {
    agencyId?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Notice[]; total: number; page: number; limit: number }> {
    const { agencyId, category, page = 1, limit = 20 } = params;

    let filter = 'isPublished = true';
    if (agencyId) filter = `authorId = "${agencyId}"`;
    if (category) filter += ` && category = "${category}"`;

    try {
      const list = await this.pb.collection(COLLECTION).getList(page, limit, {
        filter,
        sort: '-isPinned,-created',
      });

      return {
        data: list.items.map((r: any) => mapRecordToNotice(r)),
        total: list.totalItems,
        page,
        limit,
      };
    } catch (e: any) {
      if (e?.status === 404) return { data: [], total: 0, page, limit };
      throw e;
    }
  }

  async findOne(id: string): Promise<Notice> {
    const record = await this.pb.collection(COLLECTION).getOne(id).catch(() => null);
    if (!record) throw new NotFoundException(`Notice ${id} not found`);

    await this.pb.collection(COLLECTION).update(id, {
      viewCount: (Number(record.viewCount ?? 0)) + 1,
    });

    return mapRecordToNotice({ ...record, viewCount: (Number(record.viewCount ?? 0)) + 1 });
  }

  async update(id: string, authorId: string, updateNoticeDto: UpdateNoticeDto): Promise<Notice> {
    const record = await this.pb.collection(COLLECTION).getOne(id).catch(() => null);
    if (!record) throw new NotFoundException(`Notice ${id} not found`);
    if (record.authorId !== authorId) throw new NotFoundException(`Notice ${id} not found`);

    const updated = await this.pb.collection(COLLECTION).update(id, updateNoticeDto);
    return mapRecordToNotice(updated);
  }

  async remove(id: string, authorId: string): Promise<void> {
    const record = await this.pb.collection(COLLECTION).getOne(id).catch(() => null);
    if (!record) throw new NotFoundException(`Notice ${id} not found`);
    if (record.authorId !== authorId) throw new NotFoundException(`Notice ${id} not found`);

    await this.pb.collection(COLLECTION).delete(id);
  }
}
