import type {
  PaintFinishKey,
  VehicleFamily,
  VehicleSlug,
} from './vehicle-catalog';

export type UserAssetKind = 'upload';

export type AiGenerationMode = 'text-to-image' | 'image-to-image';
export type AiGenerationStatus =
  | 'queued'
  | 'processing'
  | 'succeeded'
  | 'failed';
export type DesignVisibility = 'public' | 'unlisted' | 'private';
export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

export interface WrapShareLink {
  token: string | null;
  active: boolean;
}

export interface SharedWrapPreview {
  vehicleSlug: VehicleSlug;
  finish: PaintFinishKey;
  color: string;
  version: number;
}

export interface VehicleCatalogEntry {
  id: string;
  slug: VehicleSlug;
  brand: string;
  family: VehicleFamily;
  modelName: string;
  modelYear: number | null;
  trimName: string;
  editorEnabled: boolean;
  compatibilityStatus: 'pending' | 'verified';
}

export interface UserWrapSummary {
  id: string;
  vehicleSlug: VehicleSlug;
  name: string; // Persisted work name, editable during admin review.
  usesAi: boolean;
  openToGallery: boolean;
  moderationStatus: string;
  templateVersion: string;
  version: number;
  status: string;
  canvasJson: string;
  sourceAssetsDeleted?: boolean;
  textureUrl?: string | null;
  finish: PaintFinishKey;
  sourceDesignId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface PublicDesignSummary {
  id: string;
  authorName: string;
  authorImage: string | null;
  downloadCount: number;
  likeCount: number;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  textureUrl: string | null;
  vehicleSlug: VehicleSlug;
  usesAi: boolean;
  finish: PaintFinishKey;
  moderationStatus: ModerationStatus;
  viewCount: number;
  remixCount: number;
  publishedAt: string | Date;
}

export interface CreditPack {
  productId: string;
  priceInCents: number;
  currency: 'usd';
  credits: number;
}
