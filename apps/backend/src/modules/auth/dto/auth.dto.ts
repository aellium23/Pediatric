import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class AppleSignInDto {
  @ApiProperty({ description: 'Apple identity token (JWT)' })
  @IsString()
  @IsNotEmpty()
  identityToken!: string;
}

export class GoogleSignInDto {
  @ApiProperty({ description: 'Google ID token (JWT)' })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}

export class StartEmailDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}

export class VerifyOtpDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class PasskeyVerifyRegistrationDto {
  @ApiProperty()
  @IsString()
  challenge!: string;

  @ApiProperty({ type: Object })
  @IsObject()
  response!: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceLabel?: string;
}

export class PasskeyVerifyAuthenticationDto {
  @ApiProperty()
  @IsString()
  challenge!: string;

  @ApiProperty({ type: Object })
  @IsObject()
  response!: Record<string, unknown>;
}

export class TokenResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty() expiresIn!: number;
}
