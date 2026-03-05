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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NoticesService } from './notices.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';

@Controller('notices')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Post()
  @UseGuards(AuthenticatedGuard)
  create(@Req() req: any, @Body() createNoticeDto: CreateNoticeDto) {
    return this.noticesService.create(req.user.id, createNoticeDto);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('my') my?: string,
  ) {
    const agencyId = my === 'true' && req.user ? req.user.id : undefined;
    return this.noticesService.findAll({
      agencyId,
      category,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.noticesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateNoticeDto: UpdateNoticeDto,
  ) {
    return this.noticesService.update(id, req.user.id, updateNoticeDto);
  }

  @Delete(':id')
  @UseGuards(AuthenticatedGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.noticesService.remove(id, req.user.id);
  }
}
