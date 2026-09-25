import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { Gender } from '@prisma/client';
import { MIN_PASSWORD_LENGTH } from '../../../domain/users/password.util';

export class RegisterDto {
  @ApiProperty({ example: 'Ana Madre' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'ana@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'supersecreta1', minLength: MIN_PASSWORD_LENGTH })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(100)
  password!: string;

  @ApiProperty({ enum: Gender, example: Gender.FEMALE })
  @IsEnum(Gender)
  gender!: Gender;
}
