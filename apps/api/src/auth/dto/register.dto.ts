import { IsString, Length, Matches } from "class-validator";

export class RegisterDto {
  @IsString()
  @Length(3, 32)
  @Matches(/^[A-Za-z0-9_.-]+$/, {
    message: "username may contain only letters, numbers, underscore, dot, and dash"
  })
  username!: string;

  @IsString()
  @Length(10, 72)
  password!: string;
}
