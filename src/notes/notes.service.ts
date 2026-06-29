import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from '../entities/note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly notesRepo: Repository<Note>,
  ) {}

  /** Create a note owned by the authenticated user */
  async create(ownerId: string, dto: CreateNoteDto): Promise<Note> {
    const note = this.notesRepo.create({ ...dto, ownerId });
    return this.notesRepo.save(note);
  }

  /** List ONLY the notes that belong to the authenticated user */
  async findAll(ownerId: string): Promise<Note[]> {
    return this.notesRepo.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single note.
   * Security: filters by BOTH id AND ownerId.
   * If the note belongs to another user, this returns null → 404.
   * We intentionally never return 403 to avoid leaking resource existence.
   */
  async findOne(id: string, ownerId: string): Promise<Note> {
    const note = await this.notesRepo.findOne({ where: { id, ownerId } });
    if (!note) {
      throw new NotFoundException('Nota no encontrada');
    }
    return note;
  }

  /** Update a note — only if it belongs to the authenticated user */
  async update(id: string, ownerId: string, dto: UpdateNoteDto): Promise<Note> {
    const note = await this.findOne(id, ownerId); // throws 404 if not found/not owner
    Object.assign(note, dto);
    return this.notesRepo.save(note);
  }

  /** Delete a note — only if it belongs to the authenticated user */
  async remove(id: string, ownerId: string): Promise<{ message: string }> {
    const note = await this.findOne(id, ownerId); // throws 404 if not found/not owner
    await this.notesRepo.remove(note);
    return { message: 'Nota eliminada correctamente' };
  }
}
