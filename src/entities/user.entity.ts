import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Note } from './note.entity';
import { RefreshToken } from './refresh-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  /**
   * Stored as an argon2 hash — NEVER the plain-text password.
   * select: false ensures it is never returned in queries by default.
   */
  @Column({ select: false })
  password: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Note, (note) => note.owner)
  notes: Note[];

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens: RefreshToken[];
}
