import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PocketBaseService } from '../pocketbase/pocketbase.service';
import { SaveAgencyCustomizationDto } from './dto/save-agency-customization.dto';
import {
  AgencyCustomization,
  SupportedLanguage,
} from './entities/agency-customization.entity';

const COLLECTION = 'agency_customizations';

function escapeFilterValue(val: string | undefined): string {
  if (val == null) return '';
  return String(val)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function resolveLanguage(value: unknown): SupportedLanguage {
  return value === 'en' ? 'en' : 'ko';
}

function sanitizeSlug(value: unknown): string {
  const slug = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!slug) return '';
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new BadRequestException('슬러그는 영문 소문자/숫자/하이픈(-)만 사용할 수 있습니다.');
  }
  return slug;
}

function mapRecordToCustomization(record: any): AgencyCustomization {
  const rawSettings =
    record?.settings && typeof record.settings === 'object' && !Array.isArray(record.settings)
      ? (record.settings as Record<string, unknown>)
      : {};

  const slug = typeof record?.slug === 'string' ? record.slug : '';
  const adminLanguage = resolveLanguage(rawSettings.adminLanguage ?? record?.adminLanguage);
  const serviceLanguage = resolveLanguage(rawSettings.serviceLanguage ?? record?.serviceLanguage);

  return {
    id: record.id,
    agencyId: record.agencyId,
    slug,
    adminLanguage,
    serviceLanguage,
    settings: {
      ...rawSettings,
      slug,
      adminLanguage,
      serviceLanguage,
    },
    created: record.created,
    updated: record.updated,
  };
}

@Injectable()
export class AgencyCustomizationsService {
  constructor(private readonly pb: PocketBaseService) {}
  private collectionReady = false;

  async findMyCustomization(agencyId: string): Promise<AgencyCustomization | null> {
    await this.ensurePocketBaseReady('findMyCustomization');
    await this.ensureCollectionExists();

    try {
      const record = await this.findRecordByAgencyId(agencyId);
      return record ? mapRecordToCustomization(record) : null;
    } catch (err) {
      this.handlePocketBaseError(err, 'findMyCustomization.getList');
    }
  }

  async upsertMyCustomization(
    agencyId: string,
    dto: SaveAgencyCustomizationDto,
  ): Promise<AgencyCustomization> {
    await this.ensurePocketBaseReady('upsertMyCustomization');
    await this.ensureCollectionExists();

    const settings =
      dto.settings && typeof dto.settings === 'object' && !Array.isArray(dto.settings)
        ? { ...dto.settings }
        : {};
    const slug = sanitizeSlug(settings.slug);
    const adminLanguage = resolveLanguage(settings.adminLanguage);
    const serviceLanguage = resolveLanguage(settings.serviceLanguage);

    settings.slug = slug;
    settings.adminLanguage = adminLanguage;
    settings.serviceLanguage = serviceLanguage;

    try {
      if (slug) {
        const slugConflictList = await this.pb.collection(COLLECTION).getList(1, 1, {
          filter:
            `slug = "${escapeFilterValue(slug)}"` +
            ` && agencyId != "${escapeFilterValue(agencyId)}"`,
        });
        if (slugConflictList.items.length > 0) {
          throw new ConflictException('이미 사용 중인 포털 URL(slug)입니다.');
        }
      }

      const existing = await this.findRecordByAgencyId(agencyId);
      const payload: Record<string, unknown> = {
        agencyId,
        slug: slug || null,
        adminLanguage,
        serviceLanguage,
        settings,
      };

      const record = existing
        ? await this.pb.collection(COLLECTION).update(existing.id, payload)
        : await this.pb.collection(COLLECTION).create(payload);

      return mapRecordToCustomization(record);
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof ConflictException) {
        throw err;
      }
      this.handlePocketBaseError(err, 'upsertMyCustomization');
    }
  }

  async findBySlug(slug: string): Promise<AgencyCustomization> {
    await this.ensurePocketBaseReady('findBySlug');
    await this.ensureCollectionExists();

    const normalizedSlug = sanitizeSlug(slug);
    if (!normalizedSlug) {
      throw new NotFoundException('포털을 찾을 수 없습니다.');
    }

    try {
      const list = await this.pb.collection(COLLECTION).getList(1, 1, {
        filter: `slug = "${escapeFilterValue(normalizedSlug)}"`,
      });
      const record = list.items[0];
      if (!record) throw new NotFoundException('포털을 찾을 수 없습니다.');
      return mapRecordToCustomization(record);
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) {
        throw err;
      }
      this.handlePocketBaseError(err, 'findBySlug.getList');
    }
  }

  private async findRecordByAgencyId(agencyId: string): Promise<any | null> {
    const list = await this.pb.collection(COLLECTION).getList(1, 1, {
      filter: `agencyId = "${escapeFilterValue(agencyId)}"`,
    });
    return list.items[0] ?? null;
  }

  private async ensureCollectionExists(): Promise<void> {
    if (this.collectionReady) return;

    try {
      // Fast existence check via list call.
      await this.pb.collection(COLLECTION).getList(1, 1);
      this.collectionReady = true;
      return;
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const rawMessage =
        err?.message ??
        err?.response?.message ??
        err?.response?.data?.message ??
        '';
      const lowerMessage = String(rawMessage).toLowerCase();
      const isMissingCollection =
        status === 404 &&
        (lowerMessage.includes('missing collection') ||
          lowerMessage.includes('collection context'));

      if (!isMissingCollection) throw err;
    }

    try {
      await (this.pb.pb as any).collections.create({
        name: COLLECTION,
        type: 'base',
        schema: [
          {
            name: 'agencyId',
            type: 'text',
            required: true,
            unique: false,
            options: { min: 1, max: 100, pattern: '' },
          },
          {
            name: 'slug',
            type: 'text',
            required: false,
            unique: false,
            options: { min: null, max: 120, pattern: '^[a-z0-9-]*$' },
          },
          {
            name: 'adminLanguage',
            type: 'select',
            required: false,
            unique: false,
            options: { maxSelect: 1, values: ['ko', 'en'] },
          },
          {
            name: 'serviceLanguage',
            type: 'select',
            required: false,
            unique: false,
            options: { maxSelect: 1, values: ['ko', 'en'] },
          },
          {
            name: 'settings',
            type: 'json',
            required: true,
            unique: false,
            options: {},
          },
        ],
        indexes: [
          'CREATE UNIQUE INDEX `idx_agency_customizations_agency_id` ON `agency_customizations` (`agencyId`)',
          'CREATE UNIQUE INDEX `idx_agency_customizations_slug` ON `agency_customizations` (`slug`)',
        ],
      });
      this.collectionReady = true;
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const rawMessage =
        err?.message ??
        err?.response?.message ??
        err?.response?.data?.message ??
        '';
      const lowerMessage = String(rawMessage).toLowerCase();
      const alreadyExists =
        status === 400 &&
        (lowerMessage.includes('already exists') || lowerMessage.includes('duplicate'));

      if (!alreadyExists) throw err;

      this.collectionReady = true;
    }
  }

  private async ensurePocketBaseReady(context: string): Promise<void> {
    try {
      await this.pb.ensureSuperuserAuth();
    } catch (err) {
      this.handlePocketBaseError(err, `${context}.ensureSuperuserAuth`);
    }
  }

  private handlePocketBaseError(err: any, context: string): never {
    const status = err?.status ?? err?.response?.status;
    const message = err?.message ?? err?.response?.message ?? 'Unknown error';
    const responseBody = err?.response ?? err?.data;

    console.error('[AgencyCustomizationsService] PocketBase error', {
      context,
      status,
      message,
      response: responseBody,
    });

    throw new ServiceUnavailableException(
      '사이트 커스터마이징 서비스 설정이 필요합니다. 서버의 POCKETBASE_URL/컬렉션(agency_customizations) 구성을 확인해주세요.',
    );
  }
}
