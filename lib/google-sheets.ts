import { Character, readCharacterImport } from "@/lib/character";

type SyncAction = "load" | "save";

interface SyncResponse {
  characters?: unknown;
  count?: number;
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function requestServer(
  action: SyncAction,
  characters?: Character[],
): Promise<SyncResponse> {
  const response = await fetch("/api/google-sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      ...(characters ? { characters } : {}),
    }),
    cache: "no-store",
  });

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error("저장 서버에서 올바른 응답을 받지 못했습니다.");
  }
  if (!isRecord(result)) throw new Error("저장 서버 응답 형식이 올바르지 않습니다.");
  if (!response.ok) {
    throw new Error(typeof result.error === "string" ? result.error : `서버 요청 실패 (${response.status}).`);
  }
  return result;
}

export async function saveCharactersToGoogleSheet(
  characters: Character[],
): Promise<void> {
  await requestServer("save", characters);
}

export async function loadCharactersFromGoogleSheet(): Promise<Character[]> {
  const response = await requestServer("load");
  if (!Array.isArray(response.characters)) {
    throw new Error("시트에서 캐릭터 목록을 받지 못했습니다.");
  }
  if (response.characters.length === 0) return [];
  return readCharacterImport(JSON.stringify(response.characters));
}

export function mergeGoogleCharacters(
  localCharacters: Character[],
  sheetCharacters: Character[],
): Character[] {
  const getKey = (character: Character) => character.name.trim() || character.id;
  const merged = new Map<string, Character>();
  const keyById = new Map<string, string>();
  localCharacters.forEach((character) => {
    const key = getKey(character);
    merged.set(key, character);
    keyById.set(character.id, key);
  });

  for (const sheetCharacter of sheetCharacters) {
    const key = getKey(sheetCharacter);
    const existingKey = merged.has(key) ? key : keyById.get(sheetCharacter.id);
    const localCharacter = existingKey ? merged.get(existingKey) : undefined;
    const sheetIsNewer =
      !localCharacter ||
      Date.parse(sheetCharacter.updatedAt) > Date.parse(localCharacter.updatedAt);
    if (sheetIsNewer) {
      if (existingKey && existingKey !== key) merged.delete(existingKey);
      merged.set(key, {
        ...sheetCharacter,
        ...(localCharacter?.portrait ? { portrait: localCharacter.portrait } : {}),
      });
      keyById.set(sheetCharacter.id, key);
    }
  }

  return [...merged.values()];
}
