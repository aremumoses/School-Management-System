import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ClassesService } from './classes.service';
import { CreateArmDto, UpdateArmDto } from './dto/arm.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@ApiTags('classes')
@Controller()
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Roles()
  @Get('classes')
  @ApiOperation({ summary: 'List classes, each with its arms' })
  listClasses() {
    return this.classesService.listClasses();
  }

  @Roles()
  @Get('classes/:id')
  @ApiOperation({ summary: 'Get one class with its arms' })
  getClass(@Param('id') id: string) {
    return this.classesService.getClass(id);
  }

  @Roles('ADMIN')
  @Post('classes')
  @ApiOperation({ summary: 'Create a class' })
  createClass(@Body() dto: CreateClassDto) {
    return this.classesService.createClass(dto);
  }

  @Roles('ADMIN')
  @Patch('classes/:id')
  @ApiOperation({ summary: 'Update a class' })
  updateClass(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.classesService.updateClass(id, dto);
  }

  @Roles('ADMIN')
  @Delete('classes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a class' })
  async deleteClass(@Param('id') id: string): Promise<void> {
    await this.classesService.deleteClass(id);
  }

  @Roles('ADMIN')
  @Post('classes/:id/arms')
  @ApiOperation({ summary: 'Add an arm to a class' })
  addArm(@Param('id') classId: string, @Body() dto: CreateArmDto) {
    return this.classesService.addArm(classId, dto);
  }

  @Roles('ADMIN')
  @Patch('arms/:id')
  @ApiOperation({ summary: 'Update an arm' })
  updateArm(@Param('id') id: string, @Body() dto: UpdateArmDto) {
    return this.classesService.updateArm(id, dto);
  }

  @Roles('ADMIN')
  @Delete('arms/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an arm' })
  async deleteArm(@Param('id') id: string): Promise<void> {
    await this.classesService.deleteArm(id);
  }
}
