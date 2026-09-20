import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Ciencia ficción' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ example: '#1E88E5' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  colorHex?: string;

  @ApiPropertyOptional({ example: 'Novela SF y fantasía' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
