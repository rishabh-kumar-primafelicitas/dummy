import { randomInt } from "crypto";

export class PasswordUtil {
  /**
   * Generate a random password of given length.
   * Ensures at least one uppercase, one digit and one special char.
   */
  static generateRandomPassword(length: number = 12): string {
    if (length < 4) {
      throw new Error(
        "Password length must be at least 4 to include required character sets"
      );
    }

    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const digits = "0123456789";
    const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    // pick one required char from each set
    const passwordChars = [
      uppercase[randomInt(0, uppercase.length)],
      digits[randomInt(0, digits.length)],
      special[randomInt(0, special.length)],
      lowercase[randomInt(0, lowercase.length)],
    ];

    // fill the rest
    const allChars = uppercase + lowercase + digits + special;
    for (let i = passwordChars.length; i < length; i++) {
      passwordChars.push(allChars[randomInt(0, allChars.length)]);
    }

    // shuffle in-place (Fisher–Yates)
    for (let i = passwordChars.length - 1; i > 0; i--) {
      const j = randomInt(0, i + 1);
      [passwordChars[i], passwordChars[j]] = [
        passwordChars[j],
        passwordChars[i],
      ];
    }

    return passwordChars.join("");
  }
}
