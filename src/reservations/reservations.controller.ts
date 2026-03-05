import {
  Controller,
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

@Controller('reservations')
@UseGuards(AuthenticatedGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(@Req() req: any, @Body() createReservationDto: CreateReservationDto) {
    return this.reservationsService.create(req.user.id, createReservationDto);
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
    return this.reservationsService.findAll(req.user.id, {
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
    return this.reservationsService.getDashboardStats(req.user.id);
  }

  @Get('dashboard/recent')
  getRecentReservations(@Req() req: any, @Query('limit') limit?: string) {
    return this.reservationsService.getRecentReservations(
      req.user.id,
      limit ? parseInt(limit) : 5,
    );
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.reservationsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(id, req.user.id, updateReservationDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateReservationStatusDto,
  ) {
    return this.reservationsService.updateStatus(id, req.user.id, updateStatusDto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.reservationsService.remove(id, req.user.id);
  }

  // 여행자 관련 엔드포인트
  @Get(':id/travelers')
  findTravelers(@Req() req: any, @Param('id') reservationId: string) {
    return this.reservationsService.findTravelers(reservationId, req.user.id);
  }

  @Post(':id/travelers')
  addTraveler(
    @Req() req: any,
    @Param('id') reservationId: string,
    @Body() createTravelerDto: CreateTravelerDto,
  ) {
    return this.reservationsService.addTraveler(
      reservationId,
      req.user.id,
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
      req.user.id,
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
      req.user.id,
    );
  }
}
