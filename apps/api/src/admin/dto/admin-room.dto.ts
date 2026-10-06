import { IsIn, IsString, Length, Matches } from "class-validator";

export class AdminRoomDto {
  @IsString()
  @Length(2, 64)
  name!: string;

  @IsString()
  @Length(2, 64)
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @IsIn(["PUBLIC", "PRIVATE"])
  type!: "PUBLIC" | "PRIVATE";
}
