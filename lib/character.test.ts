import assert from "node:assert/strict";
import test from "node:test";
import {
  createCharacter,
  isCharacter,
  readCharacterImport,
  readCharacterStore,
  validateCharacter,
} from "./character.ts";

function completeCharacter() {
  const character = createCharacter({
    name: "탐험자",
    ruleSet: "discovery",
    type: "직접 입력한 타입",
    descriptor: "직접 입력한 디스크립터",
    focus: "직접 입력한 포커스",
  });
  for (const key of ["might", "speed", "intellect"] as const) {
    character.stats[key] = { current: 8, max: 8, edge: 0 };
  }
  return character;
}

test("새 캐릭터는 룰북 수치를 지어내지 않고 빈 풀로 시작한다", () => {
  const character = createCharacter({
    name: "탐험자",
    ruleSet: "discovery-destiny",
    type: "",
    descriptor: "",
    focus: "",
  });

  assert.equal(character.tier, 1);
  assert.deepEqual(character.stats.might, { current: 0, max: 0, edge: 0 });
  assert.equal(character.ruleSet, "discovery-destiny");
  assert.equal(validateCharacter(character).length, 6);
});

test("캐릭터 검증은 풀 경계와 필요한 데이터 형식을 확인한다", () => {
  const character = completeCharacter();
  assert.equal(isCharacter(character), true);
  assert.deepEqual(validateCharacter(character), []);

  const invalid = {
    ...character,
    stats: {
      ...character.stats,
      might: { current: 9, max: 8, edge: 0 },
    },
  };
  assert.equal(isCharacter(invalid), false);
});

test("저장소와 단일 캐릭터 JSON을 검증해 복원한다", () => {
  const character = completeCharacter();
  const raw = JSON.stringify({ version: 1, characters: [character] });

  assert.deepEqual(readCharacterStore(raw).characters, [character]);
  assert.deepEqual(readCharacterImport(JSON.stringify(character)), [character]);
  assert.deepEqual(readCharacterImport(raw), [character]);
  assert.throws(() => readCharacterStore("{bad json"));
  assert.throws(() => readCharacterStore(JSON.stringify({ version: 1, characters: [{}] })));
  assert.throws(() => readCharacterImport(JSON.stringify({ name: "잘못된 데이터" })));
});

test("플레이어 이름을 저장하고 이전 캐릭터 데이터는 빈 이름으로 복원한다", () => {
  const character = completeCharacter();
  character.playerName = "플레이어 하나";
  assert.equal(readCharacterImport(JSON.stringify(character))[0].playerName, "플레이어 하나");

  const legacyCharacter: Record<string, unknown> = { ...character };
  delete legacyCharacter.playerName;
  assert.equal(readCharacterImport(JSON.stringify(legacyCharacter))[0].playerName, "");
});
