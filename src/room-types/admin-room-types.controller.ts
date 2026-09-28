import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { ApiErrorResponse } from '../common/api-docs/api-error-response.decorator.js';
import { API_TAGS } from '../common/api-docs/api-tags.constants.js';
import { RespondsWith } from '../common/api-docs/responds-with.decorator.js';
import { xlsxDownload } from '../common/xlsx/xlsx-file.js';
import { XLSX_CONTENT_TYPE } from '../common/xlsx/xlsx.constants.js';
import { AdminRoomTypeExportService } from './admin-room-type-export.service.js';
import { AdminRoomTypesService } from './admin-room-types.service.js';
import {
  adminRoomTypeFilterSchema,
  adminRoomTypeListResponseSchema,
  adminRoomTypeResponseSchema,
  createRoomTypeBodySchema,
  listAdminRoomTypesQuerySchema,
  updateRoomTypeBodySchema,
} from './schemas/admin-room-type.schema.js';
import { roomTypeIdParamSchema } from './schemas/room-type.schema.js';

import type { Paginated } from '../common/pagination/paginate.js';
import type {
  AdminRoomTypeFilter,
  AdminRoomTypeResponse,
  CreateRoomTypeBody,
  ListAdminRoomTypesQuery,
  UpdateRoomTypeBody,
} from './schemas/admin-room-type.schema.js';

@ApiBearerAuth()
@Roles('admin')
@ApiErrorResponse(403, 'Forbidden')
@ApiTags(API_TAGS.adminRoomTypes)
@Controller('admin/room-types')
export class AdminRoomTypesController {
  constructor(
    private readonly adminRoomTypesService: AdminRoomTypesService,
    private readonly adminRoomTypeExportService: AdminRoomTypeExportService,
  ) {}

  @Get()
  @RespondsWith(adminRoomTypeListResponseSchema, {
    status: 200,
    description: 'Every room type, on sale or not, by id',
  })
  list(
    @Query({ schema: listAdminRoomTypesQuerySchema })
    query: ListAdminRoomTypesQuery,
  ): Promise<Paginated<AdminRoomTypeResponse>> {
    return this.adminRoomTypesService.list(query);
  }

  @Get('export')
  @ApiResponse({
    status: 200,
    description:
      'Every room type matching the list filters, as one .xlsx sheet; column headers follow Accept-Language',
    content: {
      [XLSX_CONTENT_TYPE]: { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiErrorResponse(422, 'Too many room types to export; narrow the filters')
  async export(
    @Query({ schema: adminRoomTypeFilterSchema }) filter: AdminRoomTypeFilter,
    @I18nLang() lang: string,
  ): Promise<StreamableFile> {
    return xlsxDownload(
      await this.adminRoomTypeExportService.export(filter, lang),
    );
  }

  @Post()
  @RespondsWith(adminRoomTypeResponseSchema, {
    status: 201,
    description: 'The room type just created',
  })
  @ApiErrorResponse(409, 'Room type name already exists')
  create(
    @Body({ schema: createRoomTypeBodySchema }) body: CreateRoomTypeBody,
  ): Promise<AdminRoomTypeResponse> {
    return this.adminRoomTypesService.create(body);
  }

  @Patch(':id')
  @RespondsWith(adminRoomTypeResponseSchema, {
    status: 200,
    description: 'The room type as it now stands',
  })
  @ApiErrorResponse(404, 'Room type not found')
  @ApiErrorResponse(
    409,
    'Room type name already exists, or rooms already held exceed the new total on some night',
  )
  update(
    @Param('id', { schema: roomTypeIdParamSchema }) id: number,
    @Body({ schema: updateRoomTypeBodySchema }) body: UpdateRoomTypeBody,
  ): Promise<AdminRoomTypeResponse> {
    return this.adminRoomTypesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Room type deleted' })
  @ApiErrorResponse(404, 'Room type not found')
  @ApiErrorResponse(409, 'Room type has booking requests')
  remove(
    @Param('id', { schema: roomTypeIdParamSchema }) id: number,
  ): Promise<void> {
    return this.adminRoomTypesService.remove(id);
  }
}
