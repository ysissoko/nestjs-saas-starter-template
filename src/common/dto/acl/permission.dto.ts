import { Action, Subject } from '../../enums/acl';
import { IsEnum, IsOptional, IsBoolean, IsString, IsArray, IsObject } from 'class-validator';

export class PermissionDTO {
    @IsEnum(Action, { each: true })
    action: Action | Action[];

    @IsEnum(Subject, { each: true })
    subject: Subject | Subject[];

    /** an array of fields to which user has (or not) access */
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    fields?: string[];

    /** an object of conditions which restricts the rule scope */
    @IsOptional()
    @IsObject()
    conditions?: Record<string, any>;

    /** indicates whether rule allows or forbids something */
    @IsOptional()
    @IsBoolean()
    inverted?: boolean;

    /** message which explains why rule is forbidden */
    @IsOptional()
    @IsString()
    reason?: string;
}

export class CreatePermissionDto extends PermissionDTO {}

export class UpdatePermissionDto extends PermissionDTO {}

export interface PermissionRule {
    action: Action | Action[];
    subject: Subject | Subject[];
    fields?: string[];
    conditions?: Record<string, any>;
    inverted?: boolean;
    reason?: string;
}
