import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MaxLength, MinLength } from 'class-validator';

export class CreateGoalDto {
  @ApiProperty({ example: 'Videoconsola' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'Cumplir metas de lectura para canjear una consola' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 1000, minimum: 1 })
  @IsInt()
  @Min(1)
  targetPoints!: number;
}
