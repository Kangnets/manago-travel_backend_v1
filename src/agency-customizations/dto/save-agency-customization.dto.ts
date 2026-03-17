import { IsObject } from 'class-validator';

export class SaveAgencyCustomizationDto {
  @IsObject()
  settings: Record<string, unknown>;
}
