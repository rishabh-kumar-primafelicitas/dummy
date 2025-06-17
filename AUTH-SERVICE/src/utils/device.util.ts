import crypto from "crypto";
import { Request } from "express";
import { UAParser } from "ua-parser-js";

export interface DeviceInfo {
  fingerprint: string;
  deviceName: string;
  deviceType: string;
  os: string;
  osVersion: string | null;
  browser: string | null;
  browserVersion: string | null;
  ipAddress: string;
  userAgent: string;
}

export class DeviceUtil {
  static generateFingerprint(req: Request): string {
    const userAgent = req.get("User-Agent") || "";
    const acceptLanguage = req.get("Accept-Language") || "";
    const acceptEncoding = req.get("Accept-Encoding") || "";
    const ipAddress = req.ip || req.connection.remoteAddress || "";

    const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}|${ipAddress}`;

    return crypto.createHash("sha256").update(fingerprintData).digest("hex");
  }

  static parseDeviceInfo(req: Request): DeviceInfo {
    const userAgent = req.get("User-Agent") || "";
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const deviceType =
      result.device.type ||
      (result.os.name?.toLowerCase().includes("mobile") ? "mobile" : "desktop");

    return {
      fingerprint: this.generateFingerprint(req),
      deviceName:
        result.device.model || `${result.browser.name} on ${result.os.name}`,
      deviceType: deviceType,
      os: result.os.name || "Unknown",
      osVersion: result.os.version || null,
      browser: result.browser.name || null,
      browserVersion: result.browser.version || null,
      ipAddress: req.ip || req.connection.remoteAddress || "0.0.0.0",
      userAgent,
    };
  }
}
