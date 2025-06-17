export class RegexUtil {
  /**
   * Escapes special regex characters in a string to make it safe for use in RegExp
   * @param string - The string to escape
   * @returns The escaped string
   */
  static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Creates a case-insensitive regex for search functionality
   * @param searchTerm - The term to search for
   * @returns A RegExp object for case-insensitive matching
   */
  static createSearchRegex(searchTerm: string): RegExp {
    const escapedTerm = this.escapeRegExp(searchTerm);
    return new RegExp(escapedTerm, "i");
  }

  /**
   * Creates search conditions for multiple fields
   * @param searchTerm - The term to search for
   * @param fields - Array of field names to search in
   * @returns Array of search condition objects
   */
  static createMultiFieldSearchConditions(
    searchTerm: string,
    fields: string[]
  ): Record<string, RegExp>[] {
    const regex = this.createSearchRegex(searchTerm);
    return fields.map((field) => ({ [field]: regex }));
  }
}
