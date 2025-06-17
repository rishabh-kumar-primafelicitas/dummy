import { Document, Types } from 'mongoose';

export interface IDevice extends Document {
  userId: Types.ObjectId;
  deviceName: string;
  deviceType: DeviceType;
  os: string;
  osVersion: string | null;
  browser: string | null;
  browserVersion: string | null;
  fingerprint: string;
  ipAddress: string;
  trusted: boolean;
  lastUsedAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Methods 
  updateLastUsed(): Promise<void>;
  markAsTrusted(): Promise<void>;
  refreshFingerprint(newFingerprint: string): Promise<void>;
}

export enum DeviceType {
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  OTHER = 'other',
}