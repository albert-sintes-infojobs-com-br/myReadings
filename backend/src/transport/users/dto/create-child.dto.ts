import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { Gender } from '@prisma/client';

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

  @ApiProperty({ enum: Gender, example: Gender.FEMALE })
  @IsEnum(Gender)
  gender!: Gender;
}
