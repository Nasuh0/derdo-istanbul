import { IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateRoomDto {
  @IsString()
  @Length(2, 64)
  name!: string;

  @IsString()
  @Length(2, 64)
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @IsOptional()
  @IsIn(["PUBLIC", "PRIVATE"])
  type?: "PUBLIC" | "PRIVATE";
}
