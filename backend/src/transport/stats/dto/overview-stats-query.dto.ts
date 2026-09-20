import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class OverviewStatsQueryDto {
  @ApiPropertyOptional({ example: 9, description: 'Filtra al hijo indicado (debe ser propio)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  childId?: number;
}
