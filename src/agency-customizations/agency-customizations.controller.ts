import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { AgencyCustomizationsService } from './agency-customizations.service';
import { SaveAgencyCustomizationDto } from './dto/save-agency-customization.dto';

/** 직원 계정은 agencyOwnerId, 오너는 자신의 id가 agencyId */
function getEffectiveAgencyId(user: any): string {
  return user.agencyOwnerId || user.id;
}

@Controller('agency-customizations')
export class AgencyCustomizationsController {
  constructor(private readonly agencyCustomizationsService: AgencyCustomizationsService) {}

  @Get('me')
  @UseGuards(AuthenticatedGuard)
  getMyCustomization(@Req() req: any) {
    return this.agencyCustomizationsService.findMyCustomization(getEffectiveAgencyId(req.user));
  }

  @Put('me')
  @UseGuards(AuthenticatedGuard)
  saveMyCustomization(@Req() req: any, @Body() saveDto: SaveAgencyCustomizationDto) {
    return this.agencyCustomizationsService.upsertMyCustomization(
      getEffectiveAgencyId(req.user),
      saveDto,
    );
  }

  @Get('portal/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.agencyCustomizationsService.findBySlug(slug);
  }
}
