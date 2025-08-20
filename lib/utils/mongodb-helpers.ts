import { ObjectId } from 'mongodb';

/**
 * Safely converts a string to an ObjectId with validation
 * @param id The string to convert
 * @returns ObjectId or null if invalid
 */
export function safeObjectId(id: string | undefined | null): ObjectId | null {
  if (!id || !ObjectId.isValid(id)) {
    return null;
  }
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

/**
 * Converts an array of strings to ObjectIds, filtering out invalid ones
 * @param ids Array of string IDs
 * @returns Array of valid ObjectIds
 */
export function safeObjectIdArray(ids: (string | undefined | null)[]): ObjectId[] {
  return ids.map((id) => safeObjectId(id)).filter((id): id is ObjectId => id !== null);
}

/**
 * Validates if a string is a valid ObjectId
 * @param id The string to validate
 * @returns true if valid ObjectId string
 */
export function isValidObjectId(id: string | undefined | null): boolean {
  return !!id && ObjectId.isValid(id);
}

/**
 * Validates an array of ObjectId strings
 * @param ids Array of strings to validate
 * @returns true if all are valid ObjectId strings
 */
export function areValidObjectIds(ids: (string | undefined | null)[]): boolean {
  return ids.every((id) => isValidObjectId(id));
}
