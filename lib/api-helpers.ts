import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getDb, getServerTimestamp } from "./firebase-admin";

// Helper to handle errors consistently
export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

// Helper to handle success responses
export function successResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

// Helper to check if document exists and return it
export async function getDocOrError(ref: FirebaseFirestore.DocumentReference) {
  const doc = await ref.get();
  if (!doc.exists) {
    return { error: errorResponse("Not found", 404) };
  }
  return { data: { id: doc.id, ...doc.data() } };
}

// Helper to create timestamps
export function timestamps() {
  const now = getServerTimestamp();
  return { createdAt: now, updatedAt: now };
}

// Helper to update timestamp
export function updateTimestamp() {
  return { updatedAt: getServerTimestamp() };
}

// Helper to get collection reference
export function collection(path: string) {
  return getDb().collection(path);
}

// Helper to extract allowed fields from body
export function extractFields(
  body: Record<string, unknown>,
  allowedFields: string[],
) {
  const result: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      result[field] = body[field];
    }
  }
  return result;
}

// Helper for Firestore array operations
export function arrayUnion(value: unknown) {
  return FieldValue.arrayUnion(value);
}

export function arrayRemove(value: unknown) {
  return FieldValue.arrayRemove(value);
}
