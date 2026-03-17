import { Module } from '@nestjs/common';
import { AgencyCustomizationsController } from './agency-customizations.controller';
import { AgencyCustomizationsService } from './agency-customizations.service';

@Module({
  controllers: [AgencyCustomizationsController],
  providers: [AgencyCustomizationsService],
})
export class AgencyCustomizationsModule {}
