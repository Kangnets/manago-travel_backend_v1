import {
  Controller,
  ForbiddenException,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto, UpdateReservationStatusDto } from './dto/update-reservation.dto';
import { CreateTravelerDto } from './dto/create-traveler.dto';
import { UpdateTravelerDto } from './dto/update-traveler.dto';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { ReservationStatus } from './entities/reservation.entity';

/** 직원 계정은 agencyOwnerId, 오너는 자신의 id가 agencyId */
function getEffectiveAgencyId(user: any): string {
  if (!user || user.userType !== 'agency') {
    throw new ForbiddenException('여행사 계정만 이용할 수 있습니다.');
  }
  return user.agencyOwnerId || user.id;
}

@Controller('reservations')
@UseGuards(AuthenticatedGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(@Req() req: any, @Body() createReservationDto: CreateReservationDto) {
    return this.reservationsService.create(req.user, createReservationDto);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('status') status?: ReservationStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reservationsService.findAll(getEffectiveAgencyId(req.user), {
      status,
      startDate,
      endDate,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('customer/my')
  findMyCustomerReservations(
    @Req() req: any,
    @Query('status') status?: ReservationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reservationsService.findByCustomer(req.user.id, {
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('dashboard/stats')
  getDashboardStats(@Req() req: any) {
    return this.reservationsService.getDashboardStats(getEffectiveAgencyId(req.user));
  }

  @Get('dashboard/recent')
  getRecentReservations(@Req() req: any, @Query('limit') limit?: string) {
    return this.reservationsService.getRecentReservations(
      getEffectiveAgencyId(req.user),
      limit ? parseInt(limit) : 5,
    );
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.reservationsService.findOne(id, getEffectiveAgencyId(req.user));
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(id, getEffectiveAgencyId(req.user), updateReservationDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateReservationStatusDto,
  ) {
    return this.reservationsService.updateStatus(id, getEffectiveAgencyId(req.user), updateStatusDto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.reservationsService.remove(id, getEffectiveAgencyId(req.user));
  }

  // 여행자 관련 엔드포인트
  @Get(':id/travelers')
  findTravelers(@Req() req: any, @Param('id') reservationId: string) {
    return this.reservationsService.findTravelers(reservationId, getEffectiveAgencyId(req.user));
  }

  @Post(':id/travelers')
  addTraveler(
    @Req() req: any,
    @Param('id') reservationId: string,
    @Body() createTravelerDto: CreateTravelerDto,
  ) {
    return this.reservationsService.addTraveler(
      reservationId,
      getEffectiveAgencyId(req.user),
      createTravelerDto,
    );
  }

  @Patch(':reservationId/travelers/:travelerId')
  updateTraveler(
    @Req() req: any,
    @Param('reservationId') reservationId: string,
    @Param('travelerId') travelerId: string,
    @Body() updateTravelerDto: UpdateTravelerDto,
  ) {
    return this.reservationsService.updateTraveler(
      reservationId,
      travelerId,
      getEffectiveAgencyId(req.user),
      updateTravelerDto,
    );
  }

  @Delete(':reservationId/travelers/:travelerId')
  removeTraveler(
    @Req() req: any,
    @Param('reservationId') reservationId: string,
    @Param('travelerId') travelerId: string,
  ) {
    return this.reservationsService.removeTraveler(
      reservationId,
      travelerId,
      getEffectiveAgencyId(req.user),
    );
  }
}
