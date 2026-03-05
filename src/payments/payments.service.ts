import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PocketBaseService } from '../pocketbase/pocketbase.service';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

const PAYMENTS_COLLECTION = 'payments';
const RESERVATIONS_COLLECTION = 'reservations';

function mapRecordToPayment(record: any, expand?: { reservation?: any }): Payment {
  const p: Payment = {
    id: record.id,
    reservationId: record.reservationId,
    amount: Number(record.amount),
    paymentMethod: record.paymentMethod || 'bank',
    status: record.status || PaymentStatus.PENDING,
    paidAt: record.paidAt,
    memo: record.memo,
    created: record.created,
    updated: record.updated,
  };
  (p as any).reservation = expand?.reservation;
  return p;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly pb: PocketBaseService) {}

  async create(agencyId: string, createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const reservation = await this.pb.collection(RESERVATIONS_COLLECTION).getOne(createPaymentDto.reservationId).catch(() => null);
    if (!reservation) throw new NotFoundException('예약을 찾을 수 없습니다.');
    if ((reservation as any).agencyId !== agencyId)
      throw new ForbiddenException('이 예약에 대한 접근 권한이 없습니다.');

    const record = await this.pb.collection(PAYMENTS_COLLECTION).create({
      ...createPaymentDto,
      status: PaymentStatus.PENDING,
    });
    return mapRecordToPayment(record);
  }

  async findAll(
    agencyId: string,
    query: {
      startDate?: string;
      endDate?: string;
      status?: PaymentStatus;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: Payment[]; total: number; page: number; limit: number }> {
    const { startDate, endDate, status, page = 1, limit = 20 } = query;

    const allReservations = await this.pb.collection(RESERVATIONS_COLLECTION).getFullList({
      filter: `agencyId = "${agencyId}"`,
    });
    const reservationIds = allReservations.map((r: any) => r.id);

    let filter = reservationIds.length
      ? `reservationId ?= "${reservationIds.join('","')}"`
      : 'id = ""'; // no match
    if (status) filter += ` && status = "${status}"`;
    if (startDate) filter += ` && created >= "${startDate}"`;
    if (endDate) filter += ` && created <= "${endDate}"`;

    const list = await this.pb.collection(PAYMENTS_COLLECTION).getList(page, limit, {
      filter: reservationIds.length ? `(${reservationIds.map((id) => `reservationId = "${id}"`).join(' || ')})${status ? ` && status = "${status}"` : ''}${startDate ? ` && created >= "${startDate}"` : ''}${endDate ? ` && created <= "${endDate}"` : ''}` : 'id = ""',
      sort: '-created',
    });

    const data: Payment[] = [];
    for (const item of list.items as any[]) {
      let reservation: any;
      try {
        reservation = await this.pb.collection(RESERVATIONS_COLLECTION).getOne(item.reservationId);
      } catch {}
      if (reservation?.productId) {
        try {
          (reservation as any).product = await this.pb.collection('products').getOne(reservation.productId);
        } catch {}
      }
      data.push(mapRecordToPayment(item, { reservation }));
    }

    return { data, total: list.totalItems, page, limit };
  }

  async findOne(id: string, agencyId: string): Promise<Payment> {
    const record = await this.pb.collection(PAYMENTS_COLLECTION).getOne(id).catch(() => null);
    if (!record) throw new NotFoundException(`결제 정보를 찾을 수 없습니다. (ID: ${id})`);

    const reservation = await this.pb.collection(RESERVATIONS_COLLECTION).getOne((record as any).reservationId).catch(() => null);
    if (!reservation || (reservation as any).agencyId !== agencyId)
      throw new ForbiddenException('이 결제 정보에 대한 접근 권한이 없습니다.');

    let product: any;
    try {
      product = (reservation as any).productId
        ? await this.pb.collection('products').getOne((reservation as any).productId)
        : undefined;
    } catch {}
    (reservation as any).product = product;
    return mapRecordToPayment(record, { reservation });
  }

  async update(
    id: string,
    agencyId: string,
    updatePaymentDto: UpdatePaymentDto,
  ): Promise<Payment> {
    const payment = await this.findOne(id, agencyId);

    if (updatePaymentDto.status === PaymentStatus.COMPLETED && !payment.paidAt) {
      await this.pb.collection(PAYMENTS_COLLECTION).update(id, {
        ...updatePaymentDto,
        paidAt: new Date().toISOString(),
      });
      const reservation = await this.pb.collection(RESERVATIONS_COLLECTION).getOne(payment.reservationId);
      const paidAmount = Number((reservation as any).paidAmount || 0) + Number(payment.amount);
      await this.pb.collection(RESERVATIONS_COLLECTION).update(payment.reservationId, { paidAmount });
    } else {
      await this.pb.collection(PAYMENTS_COLLECTION).update(id, updatePaymentDto);
    }

    return this.findOne(id, agencyId);
  }

  async remove(id: string, agencyId: string): Promise<void> {
    await this.findOne(id, agencyId);
    await this.pb.collection(PAYMENTS_COLLECTION).delete(id);
  }

  async getSettlementSummary(
    agencyId: string,
    year: number,
  ): Promise<{ month: number; revenue: number; count: number }[]> {
    const allReservations = await this.pb.collection(RESERVATIONS_COLLECTION).getFullList({
      filter: `agencyId = "${agencyId}"`,
    });
    const reservationIds = allReservations.map((r: any) => r.id);
    const allPayments = await this.pb.collection(PAYMENTS_COLLECTION).getFullList({
      filter: `status = "${PaymentStatus.COMPLETED}"`,
    });

    const byMonth: Record<number, { revenue: number; count: number }> = {};
    for (let m = 1; m <= 12; m++) byMonth[m] = { revenue: 0, count: 0 };

    for (const p of allPayments as any[]) {
      if (!reservationIds.includes(p.reservationId)) continue;
      if (!p.paidAt) continue;
      const paidYear = parseInt(p.paidAt.slice(0, 4), 10);
      if (paidYear !== year) continue;
      const month = parseInt(p.paidAt.slice(5, 7), 10);
      byMonth[month].revenue += Number(p.amount);
      byMonth[month].count += 1;
    }

    return Object.entries(byMonth).map(([month, v]) => ({
      month: parseInt(month, 10),
      revenue: v.revenue,
      count: v.count,
    }));
  }
}
