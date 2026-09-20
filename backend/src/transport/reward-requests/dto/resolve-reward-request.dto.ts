import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ResolveRewardRequestDto {
  @ApiProperty({ enum: ['RESOLVED', 'DISMISSED'], example: 'RESOLVED' })
  @IsIn(['RESOLVED', 'DISMISSED'])
  status!: 'RESOLVED' | 'DISMISSED';
}
