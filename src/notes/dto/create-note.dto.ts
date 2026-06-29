import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
