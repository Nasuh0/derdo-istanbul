import { IsUUID } from "class-validator";

export class InviteRoomDto {
  @IsUUID()
  userId!: string;
}
