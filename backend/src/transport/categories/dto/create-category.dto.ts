import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Ciencia ficción' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: '#1E88E5', description: 'Color hex #RRGGBB' })
  @IsString()
  @IsHexColor()
  colorHex!: string;

  @ApiPropertyOptional({ example: 'Novela SF y fantasía' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
