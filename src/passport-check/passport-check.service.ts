import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

// MRZ 3자리 국가코드 → ISO 2자리 코드 변환
const MRZ_TO_ISO2: Record<string, string> = {
  KOR: 'KR', USA: 'US', JPN: 'JP', CHN: 'CN', GBR: 'GB',
  DEU: 'DE', FRA: 'FR', AUS: 'AU', CAN: 'CA', IND: 'IN',
  IDN: 'ID', MYS: 'MY', SGP: 'SG', THA: 'TH', VNM: 'VN',
  PHL: 'PH', HKG: 'HK', TWN: 'TW', NZL: 'NZ', RUS: 'RU',
  ITA: 'IT', ESP: 'ES', NLD: 'NL', CHE: 'CH', SWE: 'SE',
  NOR: 'NO', DNK: 'DK', FIN: 'FI', POL: 'PL', CZE: 'CZ',
  PRT: 'PT', GRC: 'GR', TUR: 'TR', SAU: 'SA', ARE: 'AE',
  QAT: 'QA', KWT: 'KW', BHR: 'BH', OMN: 'OM', ISR: 'IL',
  EGY: 'EG', ZAF: 'ZA', BRA: 'BR', ARG: 'AR', MEX: 'MX',
  COL: 'CO', CHL: 'CL', PER: 'PE', URY: 'UY', ECU: 'EC',
  BGD: 'BD', PAK: 'PK', LKA: 'LK', NPL: 'NP', MMR: 'MM',
  KHM: 'KH', LAO: 'LA', BRN: 'BN', MNG: 'MN', KAZ: 'KZ',
  UZB: 'UZ', UKR: 'UA', BLR: 'BY', ROU: 'RO', HUN: 'HU',
};

// 여행경보 단계 정의
export const ALARM_LEVEL_MAP: Record<string, { label: string; color: string; desc: string }> = {
  '1': { label: '여행유의', color: 'yellow',  desc: '신변안전 유의 필요' },
  '2': { label: '여행자제', color: 'orange',  desc: '불필요한 여행 자제 권고' },
  '3': { label: '출국권고', color: 'red',     desc: '즉시 출국 권고' },
  '4': { label: '여행금지', color: 'darkred', desc: '여행 금지 / 체류 금지' },
};

export interface TravelAlarmResult {
  country_nm: string;
  country_eng_nm: string;
  country_iso_alp2: string;
  alarm_lvl: string | null;
  alarm_label: string | null;
  alarm_desc: string | null;
  alarm_color: string | null;
  flag_url: string | null;
  written_dt: string | null;
  found: boolean;
}

export interface PassportVerifyResult {
  verified: boolean | null;
  message: string;
  apiAvailable: boolean;
}

export interface PassportIssuanceItem {
  year: string;
  month?: string;
  issuanceCount: number;
  passportType?: string;
  ageGroup?: string;
}

export interface PassportIssuanceResult {
  items: PassportIssuanceItem[];
  totalCount: number;
  year: string;
  isMock: boolean;
}

@Injectable()
export class PassportCheckService {
  private readonly logger = new Logger(PassportCheckService.name);
  private readonly TRAVEL_ALARM_URL =
    'http://apis.data.go.kr/1262000/TravelAlarmService2/getTravelAlarmList2';
  private readonly PASSPORT_VERIFY_URL =
    'http://apis.data.go.kr/1262000/PassportVerifyService2/getPassportVerify2';
  private readonly PASSPORT_ISSUANCE_URL =
    'https://apis.data.go.kr/1262000/PassportIssuanceService/getPassportIssuanceList';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // ─── 국가·지역별 여행경보 조회 ──────────────────────────────────
  async getTravelAlarm(mrzNationality: string): Promise<TravelAlarmResult> {
    const serviceKey = this.configService.get<string>('DATA_GO_KR_API_KEY');
    if (!serviceKey || serviceKey === 'your-data-go-kr-service-key-here') {
      throw new Error(
        'DATA_GO_KR_API_KEY가 설정되지 않았습니다.\n' +
        'data.go.kr에서 [외교부_국가·지역별 여행경보] 활용신청 후 인증키를 backend/.env에 입력하세요.',
      );
    }

    const iso2 = MRZ_TO_ISO2[mrzNationality.toUpperCase()] ?? null;
    if (!iso2) {
      throw new Error(`지원되지 않는 국가코드: ${mrzNationality}`);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.TRAVEL_ALARM_URL, {
          params: {
            serviceKey,
            returnType: 'JSON',
            numOfRows: '5',
            pageNo: '1',
            'cond[country_iso_alp2::EQ]': iso2,
          },
          timeout: 10000,
        }),
      );

      const data = response.data;
      const items = data?.response?.body?.items?.item ?? [];
      const item = Array.isArray(items) ? items[0] : items;

      if (!item) {
        return {
          country_nm: '',
          country_eng_nm: '',
          country_iso_alp2: iso2,
          alarm_lvl: null,
          alarm_label: '경보 없음',
          alarm_desc: '해당 국가에 여행경보가 발령되지 않았습니다.',
          alarm_color: 'green',
          flag_url: null,
          written_dt: null,
          found: false,
        };
      }

      const lvl = item.alarm_lvl ? String(item.alarm_lvl) : null;
      const alarmInfo = lvl ? ALARM_LEVEL_MAP[lvl] : null;

      return {
        country_nm: item.country_nm ?? '',
        country_eng_nm: item.country_eng_nm ?? '',
        country_iso_alp2: iso2,
        alarm_lvl: lvl,
        alarm_label: alarmInfo?.label ?? (lvl ? `${lvl}단계` : '경보 없음'),
        alarm_desc: alarmInfo?.desc ?? item.remark ?? '',
        alarm_color: alarmInfo?.color ?? 'green',
        flag_url: item.flag_download_url ?? null,
        written_dt: item.written_dt ?? null,
        found: true,
      };
    } catch (err: unknown) {
      this.logger.error('여행경보 API 오류', err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  // ─── 여권 진위확인 (외교부 승인 필요) ───────────────────────────
  async verifyPassport(params: {
    passportNumber: string;
    surname: string;
    givenNames: string;
    dateOfBirth: string; // YYYYMMDD
  }): Promise<PassportVerifyResult> {
    const serviceKey = this.configService.get<string>('PASSPORT_VERIFY_API_KEY');

    // API 키가 없으면 안내 메시지 반환
    if (!serviceKey) {
      return {
        verified: null,
        message:
          '여권 진위확인 API 키가 설정되지 않았습니다.\n' +
          'data.go.kr에서 [외교부_여권정보 진위확인]을 신청 후 PASSPORT_VERIFY_API_KEY 환경변수를 설정하세요.',
        apiAvailable: false,
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.PASSPORT_VERIFY_URL, {
          params: {
            serviceKey,
            returnType: 'JSON',
            passportNo: params.passportNumber,
            surName: params.surname,
            givenName: params.givenNames,
            birthDate: params.dateOfBirth.replace(/-/g, ''),
          },
          timeout: 10000,
        }),
      );

      const resultCode = response.data?.response?.header?.resultCode;
      const item = response.data?.response?.body?.item;
      const isMatch = item?.passportMatchYn === 'Y';

      return {
        verified: isMatch,
        message: isMatch
          ? '여권 정보가 외교부 데이터와 일치합니다.'
          : resultCode === '00'
          ? '여권 정보가 일치하지 않습니다. 입력 정보를 다시 확인하세요.'
          : `API 응답 코드: ${resultCode}`,
        apiAvailable: true,
      };
    } catch (err: unknown) {
      this.logger.error('여권 진위확인 API 오류', err instanceof Error ? err.message : String(err));
      return {
        verified: null,
        message: `진위확인 API 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
        apiAvailable: true,
      };
    }
  }

  // ─── 여권발급 현황 조회 (외교부 PassportIssuanceService) ──────────
  async getPassportIssuance(year?: string): Promise<PassportIssuanceResult> {
    const serviceKey = this.configService.get<string>('DATA_GO_KR_API_KEY');
    const targetYear = year ?? String(new Date().getFullYear());

    if (!serviceKey || serviceKey === 'your-data-go-kr-service-key-here') {
      this.logger.warn('DATA_GO_KR_API_KEY 미설정 — 목업 데이터 반환');
      return this.getMockIssuanceData(targetYear);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.PASSPORT_ISSUANCE_URL, {
          params: {
            serviceKey,
            returnType: 'JSON',
            numOfRows: '100',
            pageNo: '1',
            year: targetYear,
          },
          timeout: 10000,
        }),
      );

      // 응답 구조 파싱 (data.go.kr 공통 구조)
      const body = response.data?.response?.body;
      const rawItems = body?.items?.item ?? [];
      const items: PassportIssuanceItem[] = (Array.isArray(rawItems) ? rawItems : [rawItems])
        .map((it: Record<string, unknown>) => ({
          year: String(it.year ?? targetYear),
          month: it.month ? String(it.month) : undefined,
          issuanceCount: Number(it.issuanceCnt ?? it.issuance_cnt ?? it.count ?? 0),
          passportType: it.passportType ? String(it.passportType) : undefined,
          ageGroup: it.ageGroup ? String(it.ageGroup) : undefined,
        }));

      return {
        items,
        totalCount: Number(body?.totalCount ?? items.length),
        year: targetYear,
        isMock: false,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`여권발급현황 API 오류 (목업 반환): ${msg}`);
      // API 일시 오류 시 목업 데이터로 폴백
      return this.getMockIssuanceData(targetYear);
    }
  }

  // ─── 목업 데이터 (API 키 활성화 전 / 오류 시 폴백) ───────────────
  private getMockIssuanceData(year: string): PassportIssuanceResult {
    // 실제 외교부 통계 기반 근사치 (단위: 천 건)
    const BASE: Record<string, number[]> = {
      '2019': [310,290,320,280,300,320,410,430,290,280,300,310],
      '2020': [220,180, 80, 50, 40, 60, 80, 90, 70, 80, 90,100],
      '2021': [100, 90, 80, 70, 80, 90,110,120,100, 90,100,110],
      '2022': [180,200,230,260,290,310,380,400,310,280,300,320],
      '2023': [350,320,370,340,360,380,450,480,380,350,370,400],
      '2024': [380,360,400,370,390,410,490,510,410,380,400,430],
    };
    const monthly = BASE[year] ?? BASE['2024'];
    const items: PassportIssuanceItem[] = monthly.map((cnt, i) => ({
      year,
      month: String(i + 1).padStart(2, '0'),
      issuanceCount: cnt * 1000,
    }));
    return { items, totalCount: items.length, year, isMock: true };
  }
}
