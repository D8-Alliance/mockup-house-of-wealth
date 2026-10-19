import 'reflect-metadata';
import { Transform, Type } from 'class-transformer';
import { Equals, IsBoolean, IsDateString, IsIn, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { PAYOUT_CURRENCIES } from '../distribution/payout-destination.dto';

export const ASSET_TYPES = ['LAND', 'BUILDING', 'MACHINERY', 'VEHICLE', 'EQUIPMENT', 'OTHER'] as const;
export const ASSET_INTENDED_USES = ['IJARAH', 'MUSHARAKAH', 'MURABAHAH', 'UNDECIDED'] as const;
/**
 * OFFICIAL_SEARCH: Carian Rasmi from the land office; QUIT_RENT: cukai tanah receipt; SITE_PHOTO: taken on
 * site with the phone's location; SERIAL_PLATE: photo of a machine's serial plate; DOSH_CERTIFICATE: JKKP
 * certificate of fitness (PMA); INSPECTION: PUSPAKOM inspection; ROAD_TAX: road tax (LKM); ASSESSMENT:
 * cukai pintu; COMPLETION_CERT: CCC or certificate of fitness for occupation; TENANCY: a tenancy agreement.
 */
export const ASSET_DOCUMENT_TYPES = ['OWNERSHIP', 'OFFICIAL_SEARCH', 'QUIT_RENT', 'SERIAL_PLATE', 'DOSH_CERTIFICATE', 'INSPECTION', 'ROAD_TAX', 'ASSESSMENT', 'COMPLETION_CERT', 'TENANCY', 'VALUATION', 'INSURANCE', 'SITE_PHOTO', 'PHOTO', 'OTHER'] as const;

export const VEHICLE_CATEGORIES = ['LORRY', 'PRIME_MOVER', 'TRAILER', 'TANKER', 'BUS', 'OTHER'] as const;
export const BUILDING_TITLE_KINDS = ['INDIVIDUAL', 'STRATA', 'MASTER_TITLE'] as const;
export const BUILDING_USES = ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'MIXED'] as const;
export const FLOOR_AREA_UNITS = ['SQ_METRE', 'SQ_FEET'] as const;

/** Malaysian land titles: registry (GRN, PN), land office (GM, PM) and qualified titles (HS(D), HS(M)). */
export const LAND_TITLE_TYPES = ['GRN', 'GM', 'PN', 'PM', 'HSD', 'HSM'] as const;
export const LAND_AREA_UNITS = ['HECTARE', 'ACRE', 'SQ_METRE', 'SQ_FEET'] as const;
export const LAND_USE_CATEGORIES = ['AGRICULTURE', 'BUILDING', 'INDUSTRY', 'OTHER'] as const;
export const LAND_TENURES = ['FREEHOLD', 'LEASEHOLD'] as const;
export const ASSET_DECISIONS = ['VERIFIED', 'CHANGES_REQUESTED', 'REJECTED'] as const;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** What a land title says. All optional while drafting; checked as complete when the asset is submitted. */
export class LandDetailsDto {
  @IsOptional() @IsIn(LAND_TITLE_TYPES) titleType?: (typeof LAND_TITLE_TYPES)[number];
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) titleNumber?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) lotNumber?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) mukim?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) district?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) state?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1e9) areaValue?: number;
  @IsOptional() @IsIn(LAND_AREA_UNITS) areaUnit?: (typeof LAND_AREA_UNITS)[number];
  @IsOptional() @IsIn(LAND_USE_CATEGORIES) landUseCategory?: (typeof LAND_USE_CATEGORIES)[number];
  @IsOptional() @IsIn(LAND_TENURES) tenure?: (typeof LAND_TENURES)[number];
  @IsOptional() @IsDateString() leaseExpiry?: string;
  /** Share of the land held, as on the title, e.g. "1/1" or "1/2". */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(20) ownershipShare?: string;
  @IsOptional() @IsBoolean() malayReserve?: boolean;
  /** Express conditions and restrictions in interest (syarat nyata, sekatan kepentingan). */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000) restrictions?: string;
}

/** A heavy vehicle, as on its JPJ ownership certificate (VOC). Checked as complete on submit. */
export class VehicleDetailsDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(20) registrationNumber?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) chassisNumber?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) engineNumber?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60) make?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60) model?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1950) @Max(2100) yearOfManufacture?: number;
  @IsOptional() @IsIn(VEHICLE_CATEGORIES) category?: (typeof VEHICLE_CATEGORIES)[number];
  @IsOptional() @IsDateString() roadTaxExpiry?: string;
  @IsOptional() @IsDateString() insuranceExpiry?: string;
  /** PUSPAKOM periodic inspection, for commercial vehicles. */
  @IsOptional() @IsDateString() inspectionExpiry?: string;
  /** APAD operator licence or permit, for goods and passenger vehicles. */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) permitNumber?: string;
  /** Still under hire purchase: the financier has an ownership claim until it is settled. */
  @IsOptional() @IsBoolean() hirePurchase?: boolean;
}

/** Machinery or equipment, as on its purchase invoice and serial plate. */
export class MachineDetailsDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) manufacturer?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) model?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60) serialNumber?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1950) @Max(2100) yearOfManufacture?: number;
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1e7) operatingHours?: number;
  /** Lifting machinery, boilers and pressure vessels need a JKKP certificate of fitness (PMA). */
  @IsOptional() @IsBoolean() requiresDoshCertificate?: boolean;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) doshCertificateNumber?: string;
  @IsOptional() @IsDateString() doshCertificateExpiry?: string;
  @IsOptional() @IsBoolean() hirePurchase?: boolean;
}

/** A building on its own title, a strata parcel, or a parcel whose strata title is not issued yet (master title). */
export class BuildingDetailsDto {
  @IsOptional() @IsIn(BUILDING_TITLE_KINDS) titleKind?: (typeof BUILDING_TITLE_KINDS)[number];
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) titleNumber?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) lotNumber?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) mukim?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) district?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) state?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) strataTitleNumber?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) parcelNumber?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(20) storey?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) buildingName?: string;
  @IsOptional() @IsIn(BUILDING_USES) buildingUse?: (typeof BUILDING_USES)[number];
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1e8) floorArea?: number;
  @IsOptional() @IsIn(FLOOR_AREA_UNITS) floorAreaUnit?: (typeof FLOOR_AREA_UNITS)[number];
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1800) @Max(2100) yearCompleted?: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60) completionCertificateNumber?: string;
  @IsOptional() @IsBoolean() hasTenants?: boolean;
  /** What the tenants do there; it must be Shariah-compliant for an Ijarah. */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(300) tenantActivity?: string;
}

/** Sent with a site photo: where the phone was when it was taken. */
export class SitePhotoMetadataDto {
  @IsOptional() @Type(() => Number) @IsLatitude() latitude?: number;
  @IsOptional() @Type(() => Number) @IsLongitude() longitude?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) accuracyMetres?: number;
}

export class SaveAssetDto {
  @IsIn(ASSET_TYPES) assetType!: (typeof ASSET_TYPES)[number];
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(160) name!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) location?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) titleReference?: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(1e13) estimatedValue!: number;
  @IsIn(PAYOUT_CURRENCIES) currency!: string;
  @IsOptional() @IsDateString() valuationDate?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) valuerName?: string;
  @IsOptional() @IsBoolean() isEncumbered?: boolean;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) encumbranceNote?: string;
  @IsOptional() @IsIn(ASSET_INTENDED_USES) intendedUse?: (typeof ASSET_INTENDED_USES)[number];
  @IsOptional() @Type(() => Number) @IsLatitude() latitude?: number;
  @IsOptional() @Type(() => Number) @IsLongitude() longitude?: number;
  @IsOptional() @ValidateNested() @Type(() => LandDetailsDto) land?: LandDetailsDto;
  @IsOptional() @ValidateNested() @Type(() => VehicleDetailsDto) vehicle?: VehicleDetailsDto;
  /** For machinery and equipment. */
  @IsOptional() @ValidateNested() @Type(() => MachineDetailsDto) machine?: MachineDetailsDto;
  @IsOptional() @ValidateNested() @Type(() => BuildingDetailsDto) building?: BuildingDetailsDto;
}

/** What the owner confirms when submitting an asset for verification; every item must be true. */
export class SubmitAssetDto {
  @Equals(true, { message: 'Confirm that you or your organisation own this asset.' }) ownership!: boolean;
  @Equals(true, { message: 'Confirm that the asset is not used for activities that are not Shariah-compliant.' }) halalUse!: boolean;
  @Equals(true, { message: 'Confirm that the details and documents are true and complete.' }) accuracy!: boolean;
}

export class ReviewAssetDto {
  @IsIn(ASSET_DECISIONS) decision!: (typeof ASSET_DECISIONS)[number];
  @Transform(trim) @IsString() @MinLength(5, { message: 'Give a reason of at least 5 characters; the owner sees it.' }) @MaxLength(1000) note!: string;
}
