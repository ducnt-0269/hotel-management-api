import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { paginate, toSkipTake } from '../common/pagination/paginate.js';
import { containsText } from '../common/query/find-operators.js';
import { isForeignKeyViolation } from '../database/is-foreign-key-violation.js';
import { isUniqueViolation } from '../database/is-unique-violation.js';
import {
  toAdminRoomTypeResponse,
  toRoomTypeColumns,
} from './admin-room-type.mapper.js';
import { RoomTypeAmenity } from './entities/room-type-amenity.entity.js';
import { RoomType } from './entities/room-type.entity.js';
import {
  findAmenitiesOrFail,
  linkAmenities,
  roomTypesWithAllAmenities,
} from './room-type-amenities.js';
import { ensureNoOverheldNight } from './room-type-capacity.js';
import { roomTypeResponseColumns } from './room-type.mapper.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type {
  AdminRoomTypeResponse,
  CreateRoomTypeBody,
  ListAdminRoomTypesQuery,
  UpdateRoomTypeBody,
} from './schemas/admin-room-type.schema.js';

// An admin maintains the catalogue. Guests read it through RoomTypesService.
@Injectable()
export class AdminRoomTypesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(RoomType)
    private readonly roomTypesRepository: Repository<RoomType>,
  ) {}

  async list(
    query: ListAdminRoomTypesQuery,
  ): Promise<Paginated<AdminRoomTypeResponse>> {
    const [roomTypes, total] = await this.roomTypesRepository.findAndCount({
      select: roomTypeResponseColumns,
      where: {
        ...(await roomTypesWithAllAmenities(
          this.dataSource.manager,
          query.amenities,
        )),
        ...(query.q && { name: containsText(query.q) }),
      },
      relations: { amenityLinks: { amenity: true } },
      order: { id: 'ASC' },
      ...toSkipTake(query),
    });

    return paginate(roomTypes.map(toAdminRoomTypeResponse), total, query);
  }

  async create({
    amenities: codes,
    ...fields
  }: CreateRoomTypeBody): Promise<AdminRoomTypeResponse> {
    const id = await this.catchingDuplicateName(() =>
      this.dataSource.transaction(async (manager) => {
        const amenities = await findAmenitiesOrFail(manager, codes);
        const { id } = await manager.save(
          manager.create(RoomType, toRoomTypeColumns(fields)),
        );
        await linkAmenities(manager, id, amenities);
        return id;
      }),
    );

    return toAdminRoomTypeResponse(await this.findRoomTypeOrFail(id));
  }

  async update(
    id: number,
    { amenities: codes, ...fields }: UpdateRoomTypeBody,
  ): Promise<AdminRoomTypeResponse> {
    await this.catchingDuplicateName(() =>
      this.dataSource.transaction(async (manager) => {
        // The same lock a booking takes, so neither sees the other half-done.
        const roomType = await manager.findOne(RoomType, {
          select: { id: true, totalRooms: true },
          where: { id: String(id) },
          lock: { mode: 'pessimistic_write' },
        });
        if (!roomType) throw new NotFoundException('Room type not found');

        if (
          fields.totalRooms !== undefined &&
          fields.totalRooms < roomType.totalRooms
        ) {
          await ensureNoOverheldNight(manager, roomType.id, fields.totalRooms);
        }

        if (codes) {
          const amenities = await findAmenitiesOrFail(manager, codes);
          await manager.delete(RoomTypeAmenity, { roomTypeId: roomType.id });
          await linkAmenities(manager, roomType.id, amenities);
        }

        const columns = toRoomTypeColumns(fields);
        // Amenities live in another table, so a change to them alone has to
        // touch `updated_at` by hand. An empty body changes nothing.
        if (Object.keys(columns).length > 0 || codes) {
          await manager.update(RoomType, roomType.id, {
            ...columns,
            updatedAt: () => 'CURRENT_TIMESTAMP',
          });
        }
      }),
    );

    return toAdminRoomTypeResponse(await this.findRoomTypeOrFail(String(id)));
  }

  async remove(id: number): Promise<void> {
    try {
      const { affected } = await this.roomTypesRepository.delete({
        id: String(id),
      });
      if (!affected) throw new NotFoundException('Room type not found');
    } catch (error) {
      // Caught rather than checked first, so a booking raised at the same
      // moment still stops the delete.
      if (isForeignKeyViolation(error)) {
        throw new ConflictException('Room type has booking requests');
      }
      throw error;
    }
  }

  private async findRoomTypeOrFail(id: string): Promise<RoomType> {
    const roomType = await this.roomTypesRepository.findOne({
      select: roomTypeResponseColumns,
      where: { id },
      relations: { amenityLinks: { amenity: true } },
    });
    if (!roomType) throw new NotFoundException('Room type not found');
    return roomType;
  }

  // Both writes can hit the UNIQUE on `name`, at insert or at update.
  private async catchingDuplicateName<T>(write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Room type name already exists');
      }
      throw error;
    }
  }
}
