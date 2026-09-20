import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { RewardType } from '@prisma/client';

export class CreateRewardDto {
  @ApiProperty({ enum: RewardType, example: RewardType.POINTS })
  @IsEnum(RewardType)
  type!: RewardType;

  @ApiProperty({ example: 200 })
  @IsNumber()
  @IsPositive()
  value!: number;

  @ApiProperty({ example: '2026-12-01', description: 'Fecha futura' })
  @IsDateString()
  deadline!: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  penaltyValue?: number;

  @ApiPropertyOptional({ example: 3, description: 'Obligatorio si type=POINTS' })
  @IsOptional()
  @IsInt()
  goalId?: number;
}
