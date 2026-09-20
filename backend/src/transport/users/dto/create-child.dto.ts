import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChildDto {
  @ApiProperty({ example: 'Lola' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'lola@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'clave123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}
