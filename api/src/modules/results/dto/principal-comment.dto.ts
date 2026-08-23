import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PrincipalCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  principalComment!: string;
}
