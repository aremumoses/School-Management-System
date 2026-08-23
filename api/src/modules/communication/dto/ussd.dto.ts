import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

/**
 * Modeled on Africa's Talking's USSD request shape (the de facto standard
 * most Nigerian aggregators mirror) — a stateless POST per menu step, with
 * `text` carrying the full cumulative trail of everything the caller has
 * entered so far (star-separated), empty on the very first request.
 * Confirm field names against the actual aggregator contract if it turns
 * out to differ (e.g. some send `network_code` too, ignored here).
 */
export class UssdRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  serviceCode!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  @ApiProperty({
    description:
      'Cumulative, star-separated menu trail; empty string on the first request.',
  })
  @IsString()
  text!: string;
}

export class SetUssdPinDto {
  @ApiProperty({ description: '4-digit PIN' })
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  pin!: string;
}
