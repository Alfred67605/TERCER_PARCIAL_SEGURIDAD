import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  /** Find user by email — includes password hash for auth verification */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.password')   // password has select:false; explicitly include here
      .where('user.email = :email', { email })
      .getOne();
  }

  /** Find user by ID — excludes password (default) */
  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  /** Create and persist a new user */
  async create(email: string, hashedPassword: string): Promise<User> {
    const user = this.usersRepo.create({ email, password: hashedPassword });
    return this.usersRepo.save(user);
  }
}
