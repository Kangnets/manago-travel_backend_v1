import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PocketBaseService } from '../pocketbase/pocketbase.service';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { Traveler } from './entities/traveler.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto, UpdateReservationStatusDto } from './dto/update-reservation.dto';
import { CreateTravelerDto } from './dto/create-traveler.dto';
import { UpdateTravelerDto } from './dto/update-traveler.dto';

const RESERVATIONS_COLLECTION = 'reservations';
const TRAVELERS_COLLECTION = 'travelers';
const PRODUCTS_COLLECTION = 'products';

function mapRecordToReservation(record: any, expand?: { product?: any; customer?: any; travelers?: any[] }): Reservation {
  const r: Reservation = {
    id: record.id,
    reservationNumber: record.reservationNumber,
    productId: record.productId,
    agencyId: record.agencyId,
    customerId: record.customerId,
    status: record.status || ReservationStatus.PENDING,
    departureDate: record.departureDate,
    returnDate: record.returnDate,
    adultCount: record.adultCount ?? 1,
    childCount: record.childCount ?? 0,
    infantCount: record.infantCount ?? 0,
    totalAmount: Number(record.totalAmount),
    paidAmount: Number(record.paidAmount ?? 0),
    memo: record.memo,
    contactName: record.contactName,
    contactPhone: record.contactPhone,
    contactEmail: record.contactEmail,
    created: record.created,
    updated: record.updated,
  };
  (r as any).product = expand?.product;
  (r as any).customer = expand?.customer;
  (r as any).travelers = expand?.travelers;
  return r;
}

function mapRecordToTraveler(record: any): Traveler {
  return {
    id: record.id,
    reservationId: record.reservationId,
    travelerType: record.travelerType,
    passportLastName: record.passportLastName,
    passportFirstName: record.passportFirstName,
    passportNumber: record.passportNumber,
    passportExpiry: record.passportExpiry,
    birthDate: record.birthDate,
    gender: record.gender,
    nationality: record.nationality || 'KR',
    phone: record.phone,
    email: record.email,
    specialRequest: record.specialRequest,
    created: record.created,
    updated: record.updated,
  };
}

@Injectable()
export class ReservationsService {
  constructor(private readonly pb: PocketBaseService) {}

  private async generateReservationNumber(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const list = await this.pb.collection(RESERVATIONS_COLLECTION).getList(1, 1, {
      filter: `created >= "${today}"`,
      sort: '-created',
    });
    const count = list.totalItems;
    const sequence = String(count + 1).padStart(3, '0');
    return `MG-${today}-${sequence}`;
  }

  async create(agencyId: string, createReservationDto: CreateReservationDto): Promise<Reservation> {
    const reservationNumber = await this.generateReservationNumber();
    const record = await this.pb.collection(RESERVATIONS_COLLECTION).create({
      ...createReservationDto,
      agencyId,
      reservationNumber,
      status: ReservationStatus.PENDING,
      paidAmount: 0,
    });

    if (createReservationDto.travelers?.length) {
      for (const t of createReservationDto.travelers) {
        await this.pb.collection(TRAVELERS_COLLECTION).create({
          ...t,
          reservationId: record.id,
        });
      }
    }

    return this.findOne(record.id, agencyId);
  }

  async findAll(
    agencyId: string,
    query: {
      status?: ReservationStatus;
      startDate?: string;
      endDate?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: Reservation[]; total: number; page: number; limit: number }> {
    const { status, startDate, endDate, search, page = 1, limit = 20 } = query;
    let filter = `agencyId = "${agencyId}"`;
    if (status) filter += ` && status = "${status}"`;
    if (startDate) filter += ` && departureDate >= "${startDate}"`;
    if (endDate) filter += ` && departureDate <= "${endDate}"`;
    if (search) filter += ` && (reservationNumber ~ "${search.replace(/"/g, '\\"')}" || contactName ~ "${search.replace(/"/g, '\\"')}")`;

    const list = await this.pb.collection(RESERVATIONS_COLLECTION).getList(page, limit, {
      filter,
      sort: '-created',
      expand: 'productId,customerId',
    });

    const data: Reservation[] = [];
    for (const item of list.items as any[]) {
      let product: any;
      let customer: any;
      if (item.productId) {
        try {
          product = await this.pb.collection(PRODUCTS_COLLECTION).getOne(item.productId);
        } catch {}
      }
      if (item.customerId) {
        try {
          customer = await this.pb.collection('app_users').getOne(item.customerId);
        } catch {}
      }
      const travelers = await this.pb.collection(TRAVELERS_COLLECTION).getFullList({
        filter: `reservationId = "${item.id}"`,
        sort: 'created',
      });
      data.push(mapRecordToReservation(item, { product, customer, travelers: travelers as any }));
    }

    return { data, total: list.totalItems, page, limit };
  }

  async findOne(id: string, agencyId: string): Promise<Reservation> {
    const record = await this.pb.collection(RESERVATIONS_COLLECTION).getOne(id).catch(() => null);
    if (!record) throw new NotFoundException(`예약을 찾을 수 없습니다. (ID: ${id})`);
    if ((record as any).agencyId !== agencyId)
      throw new ForbiddenException('이 예약에 대한 접근 권한이 없습니다.');

    let product: any;
    let customer: any;
    if ((record as any).productId) {
      try {
        product = await this.pb.collection(PRODUCTS_COLLECTION).getOne((record as any).productId);
      } catch {}
    }
    if ((record as any).customerId) {
      try {
        customer = await this.pb.collection('app_users').getOne((record as any).customerId);
      } catch {}
    }
    const travelersList = await this.pb.collection(TRAVELERS_COLLECTION).getFullList({
      filter: `reservationId = "${id}"`,
      sort: 'created',
    });
    return mapRecordToReservation(record, {
      product,
      customer,
      travelers: travelersList as any[],
    });
  }

  async update(
    id: string,
    agencyId: string,
    updateReservationDto: UpdateReservationDto,
  ): Promise<Reservation> {
    await this.findOne(id, agencyId);
    await this.pb.collection(RESERVATIONS_COLLECTION).update(id, updateReservationDto);
    return this.findOne(id, agencyId);
  }

  async updateStatus(
    id: string,
    agencyId: string,
    updateStatusDto: UpdateReservationStatusDto,
  ): Promise<Reservation> {
    await this.findOne(id, agencyId);
    await this.pb.collection(RESERVATIONS_COLLECTION).update(id, { status: updateStatusDto.status });
    return this.findOne(id, agencyId);
  }

  async remove(id: string, agencyId: string): Promise<void> {
    const r = await this.findOne(id, agencyId);
    const travelers = await this.pb.collection(TRAVELERS_COLLECTION).getFullList({
      filter: `reservationId = "${id}"`,
    });
    for (const t of travelers) {
      await this.pb.collection(TRAVELERS_COLLECTION).delete(t.id);
    }
    await this.pb.collection(RESERVATIONS_COLLECTION).delete(id);
  }

  async findTravelers(reservationId: string, agencyId: string): Promise<Traveler[]> {
    await this.findOne(reservationId, agencyId);
    const list = await this.pb.collection(TRAVELERS_COLLECTION).getFullList({
      filter: `reservationId = "${reservationId}"`,
      sort: 'created',
    });
    return list.map((r: any) => mapRecordToTraveler(r));
  }

  async addTraveler(
    reservationId: string,
    agencyId: string,
    createTravelerDto: CreateTravelerDto,
  ): Promise<Traveler> {
    await this.findOne(reservationId, agencyId);
    const record = await this.pb.collection(TRAVELERS_COLLECTION).create({
      ...createTravelerDto,
      reservationId,
    });
    return mapRecordToTraveler(record);
  }

  async updateTraveler(
    reservationId: string,
    travelerId: string,
    agencyId: string,
    updateTravelerDto: UpdateTravelerDto,
  ): Promise<Traveler> {
    await this.findOne(reservationId, agencyId);
    const record = await this.pb.collection(TRAVELERS_COLLECTION).getOne(travelerId).catch(() => null);
    if (!record || (record as any).reservationId !== reservationId)
      throw new NotFoundException(`여행자를 찾을 수 없습니다. (ID: ${travelerId})`);
    const updated = await this.pb.collection(TRAVELERS_COLLECTION).update(travelerId, updateTravelerDto);
    return mapRecordToTraveler(updated);
  }

  async removeTraveler(
    reservationId: string,
    travelerId: string,
    agencyId: string,
  ): Promise<void> {
    await this.findOne(reservationId, agencyId);
    const record = await this.pb.collection(TRAVELERS_COLLECTION).getOne(travelerId).catch(() => null);
    if (!record || (record as any).reservationId !== reservationId)
      throw new NotFoundException(`여행자를 찾을 수 없습니다. (ID: ${travelerId})`);
    await this.pb.collection(TRAVELERS_COLLECTION).delete(travelerId);
  }

  async getDashboardStats(agencyId: string): Promise<{
    totalReservations: number;
    pendingReservations: number;
    confirmedReservations: number;
    thisMonthRevenue: number;
    lastMonthRevenue: number;
  }> {
    const all = await this.pb.collection(RESERVATIONS_COLLECTION).getFullList({
      filter: `agencyId = "${agencyId}"`,
    });
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();
    const thisMonthStart = `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-01`;
    const lastMonthStart = thisMonth === 0 ? `${thisYear - 1}-12-01` : `${thisYear}-${String(thisMonth).padStart(2, '0')}-01`;
    const lastMonthEnd = thisMonth === 0 ? `${thisYear - 1}-12-31` : new Date(thisYear, thisMonth, 0).toISOString().slice(0, 10);

    const totalReservations = all.length;
    const pendingReservations = all.filter((r: any) => r.status === ReservationStatus.PENDING).length;
    const confirmedReservations = all.filter((r: any) => r.status === ReservationStatus.CONFIRMED).length;

    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;
    for (const r of all as any[]) {
      const created = r.created?.slice(0, 10);
      const status = r.status;
      const paid = Number(r.paidAmount || 0);
      if (status === ReservationStatus.CONFIRMED || status === ReservationStatus.COMPLETED) {
        if (created >= thisMonthStart) thisMonthRevenue += paid;
        if (created >= lastMonthStart && created <= lastMonthEnd) lastMonthRevenue += paid;
      }
    }

    return {
      totalReservations,
      pendingReservations,
      confirmedReservations,
      thisMonthRevenue,
      lastMonthRevenue,
    };
  }

  async getRecentReservations(agencyId: string, limit: number = 5): Promise<Reservation[]> {
    const list = await this.pb.collection(RESERVATIONS_COLLECTION).getList(1, limit, {
      filter: `agencyId = "${agencyId}"`,
      sort: '-created',
    });
    const data: Reservation[] = [];
    for (const item of list.items as any[]) {
      let product: any;
      try {
        product = item.productId ? await this.pb.collection(PRODUCTS_COLLECTION).getOne(item.productId) : undefined;
      } catch {}
      data.push(mapRecordToReservation(item, { product }));
    }
    return data;
  }

  // 일반 사용자용: customerId 또는 agencyId(본인 직접 예약)로 예약 조회
  async findByCustomer(
    userId: string,
    query: { status?: ReservationStatus; page?: number; limit?: number },
  ): Promise<{ data: Reservation[]; total: number; page: number; limit: number }> {
    const { status, page = 1, limit = 20 } = query;
    let filter = `(customerId = "${userId}" || agencyId = "${userId}")`;
    if (status) filter += ` && status = "${status}"`;

    try {
      const list = await this.pb.collection(RESERVATIONS_COLLECTION).getList(page, limit, {
        filter,
        sort: '-created',
      });

      const data: Reservation[] = [];
      for (const item of list.items as any[]) {
        let product: any;
        try {
          product = item.productId ? await this.pb.collection(PRODUCTS_COLLECTION).getOne(item.productId) : undefined;
        } catch {}
        data.push(mapRecordToReservation(item, { product }));
      }

      return { data, total: list.totalItems, page, limit };
    } catch (e: any) {
      if (e?.status === 404) return { data: [], total: 0, page, limit };
      throw e;
    }
  }
}
