import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';

/** All routes in this controller require a valid access token */
@UseGuards(JwtAccessGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  /** POST /notes — Create a note for the authenticated user */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: CreateNoteDto,
  ) {
    return this.notesService.create(req.user.sub, dto);
  }

  /** GET /notes — List only the authenticated user's notes */
  @Get()
  findAll(@Req() req: Request & { user: { sub: string } }) {
    return this.notesService.findAll(req.user.sub);
  }

  /** GET /notes/:id — Get one note (404 if not found or belongs to another user) */
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.notesService.findOne(id, req.user.sub);
  }

  /** PATCH /notes/:id — Update a note (404 if not found or belongs to another user) */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { sub: string } },
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(id, req.user.sub, dto);
  }

  /** DELETE /notes/:id — Delete a note (404 if not found or belongs to another user) */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.notesService.remove(id, req.user.sub);
  }
}
