import assert from "node:assert/strict";
import test from "node:test";
import { createCharacter } from "@/lib/character";
import { mergeGoogleCharacters } from "@/lib/google-sheets";

test("Google Sheets 가져오기는 최신 수정본을 병합하고 로컬 초상화를 보존한다", () => {
  const local = {
    ...createCharacter({
      name: "로컬 인물",
      ruleSet: "discovery",
      type: "나노",
      descriptor: "영리한",
      focus: "정신 능력을 쓴다",
    }),
    updatedAt: "2026-01-01T00:00:00.000Z",
    portrait: "data:image/png;base64,local",
  };
  const newerSheetCopy = {
    ...local,
    name: "시트 인물",
    updatedAt: "2026-01-02T00:00:00.000Z",
    portrait: undefined,
  };
  const remoteOnly = {
    ...createCharacter({
      name: "시트 전용 인물",
      ruleSet: "discovery",
      type: "잭",
      descriptor: "날랜",
      focus: "뒷골목을 다닌다",
    }),
  };

  const result = mergeGoogleCharacters([local], [newerSheetCopy, remoteOnly]);

  assert.equal(result.length, 2);
  assert.equal(result[0].name, "시트 인물");
  assert.equal(result[0].portrait, "data:image/png;base64,local");
  assert.equal(result[1].id, remoteOnly.id);
});

test("Google Sheets 가져오기는 더 오래된 시트 데이터로 로컬 수정을 덮지 않는다", () => {
  const local = {
    ...createCharacter({
      name: "최신 로컬 인물",
      ruleSet: "discovery",
      type: "글레이브",
      descriptor: "강인한",
      focus: "멋들어지게 싸운다",
    }),
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
  const olderSheetCopy = {
    ...local,
    name: "오래된 시트 인물",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const result = mergeGoogleCharacters([local], [olderSheetCopy]);

  assert.equal(result.length, 1);
  assert.equal(result[0].name, "최신 로컬 인물");
});

test("Google Sheets 가져오기는 이름이 같은 다른 ID 캐릭터를 갱신한다", () => {
  const local = {
    ...createCharacter({
      name: "같은 이름",
      ruleSet: "discovery",
      type: "잭",
      descriptor: "날랜",
      focus: "뒷골목을 다닌다",
    }),
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const sheetCopy = {
    ...createCharacter({
      name: "같은 이름",
      ruleSet: "discovery",
      type: "나노",
      descriptor: "영리한",
      focus: "정신 능력을 쓴다",
    }),
    updatedAt: "2026-01-02T00:00:00.000Z",
  };

  const result = mergeGoogleCharacters([local], [sheetCopy]);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, sheetCopy.id);
  assert.equal(result[0].type, "나노");
});
