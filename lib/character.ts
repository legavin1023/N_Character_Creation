export const STAT_KEYS = ["might", "speed", "intellect"] as const;

export type StatKey = (typeof STAT_KEYS)[number];
export type RuleSet = "discovery" | "discovery-destiny";
export type DamageState = "hale" | "impaired" | "debilitated" | "dead";
export type SkillLevel = "inability" | "untrained" | "trained" | "specialized";
export type RecoveryOpportunity = "action" | "minutes" | "hour" | "hours";
export type AdvancementChoice =
  | "pool"
  | "edge"
  | "effort"
  | "skill"
  | "other";

export interface StatPool {
  current: number;
  max: number;
  edge: number;
}

export interface Skill {
  id: string;
  name: string;
  level: SkillLevel;
  note: string;
}

export interface CharacterEntry {
  id: string;
  name: string;
  description: string;
  used?: boolean;
  cost?: string;
  modifier?: string;
  damage?: string;
  cypherKind?: "immediate" | "procedural";
}

export interface CharacterBackground {
  origin: string;
  appearance: string;
  personality: string;
  history: string;
  motivation: string;
  goal: string;
  secret: string;
  connections: string;
}

export interface ArmorRecord {
  name: string;
  value: number;
  mightCost: number;
  speedCost: number;
  note: string;
}

export interface Advancement {
  id: string;
  tier: number;
  choice: AdvancementChoice;
  detail: string;
  target?: StatKey;
  skillId?: string;
  xpCost: number;
  completedAt: string;
}

export interface RecoveryState {
  completed: RecoveryOpportunity[];
  result: number | null;
  bonus: number;
}

export interface Character {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  playerName: string;
  portrait?: string;
  portraitFileId?: string;
  ruleSet: RuleSet;
  type: string;
  descriptor: string;
  focus: string;
  tier: number;
  xp: number;
  effort: number;
  stats: Record<StatKey, StatPool>;
  skills: Skill[];
  abilities: CharacterEntry[];
  equipment: CharacterEntry[];
  cyphers: CharacterEntry[];
  cypherLimit: number;
  attacks: CharacterEntry[];
  artifacts: CharacterEntry[];
  oddities: CharacterEntry[];
  armor: ArmorRecord;
  shins: number;
  recovery: RecoveryState;
  advancements: Advancement[];
  background: CharacterBackground;
  damageState: DamageState;
  notes: string;
}

export interface CharacterStore {
  version: 1;
  characters: Character[];
}

export const STAT_LABELS: Record<StatKey, { ko: string; en: string }> = {
  might: { ko: "힘", en: "Might" },
  speed: { ko: "속력", en: "Speed" },
  intellect: { ko: "지성", en: "Intellect" },
};

export const DAMAGE_LABELS: Record<DamageState, string> = {
  hale: "정상",
  impaired: "부상",
  debilitated: "기력 소진·빈사",
  dead: "사망",
};

export const DAMAGE_TRACK_STATES = [
  "hale",
  "impaired",
  "debilitated",
] as const satisfies readonly DamageState[];

export const RECOVERY_OPPORTUNITIES: {
  id: RecoveryOpportunity;
  label: string;
}[] = [
  { id: "action", label: "1 액션" },
  { id: "minutes", label: "10분" },
  { id: "hour", label: "1시간" },
  { id: "hours", label: "10시간" },
];

export const ADVANCEMENT_CHOICES: {
  id: AdvancementChoice;
  label: string;
  detail: string;
}[] = [
  { id: "pool", label: "능력치 향상", detail: "역량 풀에 4점 투자" },
  { id: "edge", label: "완벽에 다가가기", detail: "원하는 재능 하나에 1 추가" },
  { id: "effort", label: "추가 분발", detail: "분발 점수 1 증가" },
  { id: "skill", label: "기능 훈련", detail: "기능을 익숙함 또는 능숙함으로 향상" },
  { id: "other", label: "기타", detail: "다른 성장 선택을 직접 기록" },
];

export const EMPTY_BACKGROUND: CharacterBackground = {
  origin: "",
  appearance: "",
  personality: "",
  history: "",
  motivation: "",
  goal: "",
  secret: "",
  connections: "",
};

const EMPTY_ARMOR: ArmorRecord = {
  name: "",
  value: 0,
  mightCost: 0,
  speedCost: 0,
  note: "",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

export function createCharacter(
  input: Pick<Character, "name" | "ruleSet" | "type" | "descriptor" | "focus">,
): Character {
  const timestamp = new Date().toISOString();
  const emptyPool = (): StatPool => ({ current: 0, max: 0, edge: 0 });

  return {
    id: crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
    playerName: "",
    tier: 1,
    xp: 0,
    effort: 0,
    stats: {
      might: emptyPool(),
      speed: emptyPool(),
      intellect: emptyPool(),
    },
    skills: [],
    abilities: [],
    equipment: [],
    cyphers: [],
    cypherLimit: 0,
    attacks: [],
    artifacts: [],
    oddities: [],
    armor: { ...EMPTY_ARMOR },
    shins: 0,
    recovery: { completed: [], result: null, bonus: 0 },
    advancements: [],
    background: { ...EMPTY_BACKGROUND },
    damageState: "hale",
    notes: "",
  };
}

export function isCharacter(value: unknown): value is Character {
  if (!isRecord(value) || !isRecord(value.stats)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    (value.playerName !== undefined && typeof value.playerName !== "string") ||
    (value.portrait !== undefined &&
      (typeof value.portrait !== "string" ||
        !value.portrait.startsWith("data:image/") ||
        value.portrait.length > 3_000_000)) ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string" ||
    (value.ruleSet !== "discovery" &&
      value.ruleSet !== "discovery-destiny") ||
    typeof value.type !== "string" ||
    typeof value.descriptor !== "string" ||
    typeof value.focus !== "string" ||
    !isNonNegativeInteger(value.tier) ||
    !isNonNegativeInteger(value.xp) ||
    (value.effort !== undefined && !isNonNegativeInteger(value.effort)) ||
    (value.shins !== undefined && !isNonNegativeInteger(value.shins)) ||
    (value.cypherLimit !== undefined &&
      !isNonNegativeInteger(value.cypherLimit)) ||
    !["hale", "impaired", "debilitated", "dead"].includes(
      String(value.damageState),
    ) ||
    typeof value.notes !== "string"
  ) {
    return false;
  }

  for (const key of STAT_KEYS) {
    const stat = value.stats[key];
    if (
      !isRecord(stat) ||
      !isNonNegativeInteger(stat.current) ||
      !isNonNegativeInteger(stat.max) ||
      !isNonNegativeInteger(stat.edge) ||
      Number(stat.current) > Number(stat.max)
    ) {
      return false;
    }
  }

  return (
    isSkillList(value.skills) &&
    isEntryList(value.abilities) &&
    isEntryList(value.equipment) &&
    isEntryList(value.cyphers) &&
    (value.attacks === undefined || isEntryList(value.attacks)) &&
    (value.artifacts === undefined || isEntryList(value.artifacts)) &&
    (value.oddities === undefined || isEntryList(value.oddities)) &&
    (value.cypherLimit === undefined ||
      isNonNegativeInteger(value.cypherLimit)) &&
    isValidArmor(value.armor) &&
    isValidRecovery(value.recovery) &&
    isValidAdvancements(value.advancements) &&
    isValidBackground(value.background)
  );
}

function isValidArmor(value: unknown): boolean {
  if (value === undefined) return true;
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    isNonNegativeInteger(value.value) &&
    (value.mightCost === undefined || isNonNegativeInteger(value.mightCost)) &&
    isNonNegativeInteger(value.speedCost) &&
    typeof value.note === "string"
  );
}

function isValidRecovery(value: unknown): boolean {
  if (value === undefined) return true;
  return (
    isRecord(value) &&
    Array.isArray(value.completed) &&
    value.completed.every((item) =>
      ["action", "minutes", "hour", "hours"].includes(String(item)),
    ) &&
    (value.result === undefined ||
      value.result === null ||
      isNonNegativeInteger(value.result)) &&
    (value.bonus === undefined || isNonNegativeInteger(value.bonus))
  );
}

function isValidAdvancements(value: unknown): boolean {
  if (value === undefined) return true;
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        isNonNegativeInteger(item.tier) &&
        ["pool", "edge", "effort", "skill", "other"].includes(
          String(item.choice),
        ) &&
        typeof item.detail === "string" &&
        item.xpCost === 4 &&
        typeof item.completedAt === "string" &&
        (item.target === undefined ||
          STAT_KEYS.includes(item.target as StatKey)) &&
        (item.skillId === undefined || typeof item.skillId === "string"),
    )
  );
}

function isValidBackground(value: unknown): boolean {
  if (value === undefined) return true;
  return (
    isRecord(value) &&
    [
      "origin",
      "appearance",
      "personality",
      "history",
      "motivation",
      "goal",
      "secret",
      "connections",
    ].every((key) => typeof value[key] === "string")
  );
}

function isSkillList(value: unknown): value is Skill[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.note === "string" &&
        ["inability", "untrained", "trained", "specialized"].includes(
          String(item.level),
        ),
    )
  );
}

function isEntryList(value: unknown): value is CharacterEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.description === "string" &&
        (item.cost === undefined || typeof item.cost === "string") &&
        (item.modifier === undefined || typeof item.modifier === "string") &&
        (item.damage === undefined || typeof item.damage === "string") &&
        (item.cypherKind === undefined ||
          item.cypherKind === "immediate" ||
          item.cypherKind === "procedural") &&
        (item.cypherKind === undefined ||
          item.cypherKind === "immediate" ||
          item.cypherKind === "procedural") &&
        (item.used === undefined || typeof item.used === "boolean"),
    )
  );
}

export function readCharacterStore(raw: string | null): CharacterStore {
  if (!raw) return { version: 1, characters: [] };

  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.characters)) {
    throw new Error("저장 데이터의 형식이 올바르지 않습니다.");
  }

  if (!parsed.characters.every(isCharacter)) {
    throw new Error("저장 데이터에 유효하지 않은 캐릭터가 포함되어 있습니다.");
  }

  return {
    version: 1,
    characters: parsed.characters.map(migrateCharacter),
  };
}

export function readCharacterImport(raw: string): Character[] {
  const parsed: unknown = JSON.parse(raw);
  const imported = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && parsed.version === 1 && Array.isArray(parsed.characters)
      ? parsed.characters
      : [parsed];

  if (imported.length === 0 || !imported.every(isCharacter)) {
    throw new Error("가져올 캐릭터 JSON의 형식이 올바르지 않습니다.");
  }

  return imported.map(migrateCharacter);
}

function migrateCharacter(value: Character): Character {
  return {
    ...value,
    playerName: value.playerName ?? "",
    effort: value.effort ?? 0,
    cypherLimit: value.cypherLimit ?? 0,
    attacks: value.attacks ?? [],
    artifacts: value.artifacts ?? [],
    oddities: value.oddities ?? [],
    armor: value.armor
      ? { ...EMPTY_ARMOR, ...value.armor }
      : { ...EMPTY_ARMOR },
    shins: value.shins ?? 0,
    recovery: value.recovery
      ? {
          completed: value.recovery.completed,
          result: value.recovery.result ?? null,
          bonus: value.recovery.bonus ?? 0,
        }
      : { completed: [], result: null, bonus: 0 },
    advancements: value.advancements ?? [],
    background: value.background ?? { ...EMPTY_BACKGROUND },
  };
}

export function getCharacterIdentity(character: Character): string {
  const descriptor = character.descriptor.trim();
  const type = character.type.trim();
  const focus = character.focus.trim();
  if (!descriptor && !type && !focus) return "정체성 정보를 입력해 주세요";

  const subject = type
    ? [descriptor, type].filter(Boolean).join(" ")
    : descriptor
      ? `${descriptor} 모험가`
      : "모험가";
  if (!focus) return `나는 ${subject}입니다.`;
  const lead = type
    ? `나는 ${subject}이며`
    : descriptor
      ? `나는 ${subject}로서`
      : "나는 모험가로서";
  const punctuation = /[.!?。]$/.test(focus) ? "" : ".";
  return `${lead}, ${focus}${punctuation}`;
}

export function getAbilityCategory(type: string): { ko: string; en: string } {
  const normalized = type.trim().toLocaleLowerCase();
  if (normalized.includes("나노") || normalized.includes("nano")) {
    return { ko: "에소테리", en: "ESOTERIES" };
  }
  if (normalized.includes("글레이브") || normalized.includes("glaive")) {
    return { ko: "전투술", en: "COMBAT TRICKS" };
  }
  if (normalized === "잭" || normalized.includes("jack")) {
    return { ko: "재간", en: "TRICKS" };
  }
  return { ko: "특수 능력", en: "ABILITIES" };
}

export function validateCharacter(character: Character): string[] {
  const errors: string[] = [];

  if (!character.name.trim()) errors.push("캐릭터 이름을 입력해 주세요.");
  if (!character.type.trim()) errors.push("유형을 입력해 주세요.");
  if (!character.descriptor.trim()) errors.push("수식어를 입력해 주세요.");
  if (!character.focus.trim()) errors.push("특징을 입력해 주세요.");

  for (const key of STAT_KEYS) {
    if (character.stats[key].max === 0) {
      errors.push(`${STAT_LABELS[key].ko} 최대 풀을 입력해 주세요.`);
    }
  }

  return errors;
}
