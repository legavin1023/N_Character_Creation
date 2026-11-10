"use client";

import {
  ChangeEvent,
  Dispatch,
  FormEvent,
  ReactNode,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Character,
  CharacterEntry,
  Advancement,
  AdvancementChoice,
  ADVANCEMENT_CHOICES,
  EMPTY_BACKGROUND,
  DamageState,
  DAMAGE_LABELS,
  DAMAGE_TRACK_STATES,
  getAbilityCategory,
  getCharacterIdentity,
  readCharacterImport,
  readCharacterStore,
  RuleSet,
  RecoveryOpportunity,
  RECOVERY_OPPORTUNITIES,
  Skill,
  SkillLevel,
  STAT_KEYS,
  STAT_LABELS,
  StatKey,
  validateCharacter,
} from "@/lib/character";
import {
  loadCharactersFromGoogleSheet,
  mergeGoogleCharacters,
  saveCharactersToGoogleSheet,
} from "@/lib/google-sheets";

type View = "home" | "sheet" | "rules" | "settings";
type Theme = "light" | "dark";

const STORAGE_KEY = "numenera-character-studio:v1";
const THEME_KEY = "numenera-character-studio:theme";

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  inability: "무능",
  untrained: "비숙련",
  trained: "익숙함",
  specialized: "능숙함",
};

function makeId() {
  return crypto.randomUUID();
}

function Icon({
  name,
  size = 18,
}: {
  name: "home" | "person" | "book" | "settings" | "plus" | "arrow" | "save" | "download" | "upload" | "spark" | "trash" | "copy" | "check" | "close" | "moon" | "sun" | "shield" | "box" | "dice";
  size?: number;
}) {
  const paths: Record<typeof name, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    person: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21c.3-4 2.7-6 7-6s6.7 2 7 6" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z" /><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h8M8 10h6" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    save: <><path d="M5 3h12l3 3v15H4V3z" /><path d="M8 3v6h8V3M8 21v-8h8v8" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 19v2h16v-2" /></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5M4 18v3h16v-3" /></>,
    spark: <><path d="m12 3 1.5 6.5L20 12l-6.5 1.5L12 20l-1.5-6.5L4 12l6.5-2.5L12 3Z" /><path d="m19 3 .6 2.4L22 6l-2.4.6L19 9l-.6-2.4L16 6l2.4-.6L19 3Z" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    moon: <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9" /></>,
    dice: <><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="16" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function QuickAdd({
  label,
  onAdd,
  descriptionPlaceholder = "메모 또는 설명 (선택)",
}: {
  label: string;
  onAdd: (name: string, description: string) => void;
  descriptionPlaceholder?: string;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), description.trim());
    setName("");
    setDescription("");
  }

  return (
    <form className="quick-add" onSubmit={submit}>
      <label className="sr-only" htmlFor={`quick-${label}`}>{label} 이름</label>
      <input
        id={`quick-${label}`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={`${label} 이름 입력`}
        maxLength={100}
      />
      <input
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder={descriptionPlaceholder}
        maxLength={300}
        aria-label={`${label} 설명`}
      />
      <button className="icon-button add-entry" type="submit" aria-label={`${label} 추가`} disabled={!name.trim()}>
        <Icon name="plus" size={16} />
      </button>
    </form>
  );
}

function AbilityQuickAdd({
  onAdd,
}: {
  onAdd: (name: string, cost: string, description: string) => void;
}) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [description, setDescription] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), cost.trim(), description.trim());
    setName("");
    setCost("");
    setDescription("");
  }

  return (
    <form className="quick-add ability-add" onSubmit={submit}>
      <input aria-label="능력 이름" value={name} onChange={(event) => setName(event.target.value)} placeholder="능력" maxLength={100} />
      <input aria-label="능력 비용" value={cost} onChange={(event) => setCost(event.target.value)} placeholder="비용" maxLength={40} />
      <input aria-label="능력 사용 조건" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="사용 조건 · 효과" maxLength={300} />
      <button className="icon-button add-entry" type="submit" aria-label="능력 추가" disabled={!name.trim()}><Icon name="plus" size={16} /></button>
    </form>
  );
}

function CypherQuickAdd({
  onAdd,
}: {
  onAdd: (name: string, description: string, cypherKind: "immediate" | "procedural") => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cypherKind, setCypherKind] = useState<"immediate" | "procedural">("immediate");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), description.trim(), cypherKind);
    setName("");
    setDescription("");
  }

  return (
    <form className="quick-add cypher-add" onSubmit={submit}>
      <input aria-label="사이퍼 이름" value={name} onChange={(event) => setName(event.target.value)} placeholder="사이퍼" maxLength={100} />
      <select aria-label="사이퍼 종류" value={cypherKind} onChange={(event) => setCypherKind(event.target.value as "immediate" | "procedural")}>
        <option value="immediate">급용</option>
        <option value="procedural">절차</option>
      </select>
      <input aria-label="사이퍼 효과" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="레벨 · 효과" maxLength={300} />
      <button className="icon-button add-entry" type="submit" aria-label="사이퍼 추가" disabled={!name.trim()}><Icon name="plus" size={16} /></button>
    </form>
  );
}

function AttackQuickAdd({
  onAdd,
}: {
  onAdd: (name: string, modifier: string, damage: string, description: string) => void;
}) {
  const [name, setName] = useState("");
  const [modifier, setModifier] = useState("");
  const [damage, setDamage] = useState("");
  const [description, setDescription] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), modifier.trim(), damage.trim(), description.trim());
    setName("");
    setModifier("");
    setDamage("");
    setDescription("");
  }

  return (
    <form className="quick-add attack-add" onSubmit={submit}>
      <input aria-label="공격 이름" value={name} onChange={(event) => setName(event.target.value)} placeholder="공격" maxLength={100} />
      <input aria-label="공격 보정" value={modifier} onChange={(event) => setModifier(event.target.value)} placeholder="보정" maxLength={40} />
      <input aria-label="공격 피해" value={damage} onChange={(event) => setDamage(event.target.value)} placeholder="피해" maxLength={40} />
      <input aria-label="공격 메모" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="사거리 · 메모" maxLength={300} />
      <button className="icon-button add-entry" type="submit" aria-label="공격 추가" disabled={!name.trim()}><Icon name="plus" size={16} /></button>
    </form>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "방금 전";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function Home() {
  const [accessState, setAccessState] = useState<"checking" | "locked" | "unavailable" | "unlocked">("checking");
  const [sitePassword, setSitePassword] = useState("");
  const [accessError, setAccessError] = useState("");
  const [accessBusy, setAccessBusy] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>("home");
  const [theme, setTheme] = useState<Theme>("light");
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [newCharacter, setNewCharacter] = useState({
    name: "",
    ruleSet: "discovery" as RuleSet,
    type: "",
    descriptor: "",
    focus: "",
  });
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/site-access", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { configured?: boolean; authenticated?: boolean };
        if (!active) return;
        if (!response.ok || !result.configured) {
          setAccessState("unavailable");
          return;
        }
        setAccessState(result.authenticated ? "unlocked" : "locked");
      })
      .catch(() => {
        if (active) {
          setAccessError("사이트 잠금 상태를 확인하지 못했습니다. 연결을 확인하고 새로고침해 주세요.");
          setAccessState("unavailable");
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const store = readCharacterStore(window.localStorage.getItem(STORAGE_KEY));
        setCharacters(store.characters);
        const storedTheme = window.localStorage.getItem(THEME_KEY);
        if (storedTheme === "light" || storedTheme === "dark") setTheme(storedTheme);
        setStorageReady(true);
      } catch (error) {
        setStorageError(error instanceof Error ? error.message : "저장 데이터를 읽지 못했습니다.");
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated || !storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, characters }));
      if (storageError) window.setTimeout(() => setStorageError(""), 0);
    } catch {
      window.setTimeout(
        () => setStorageError("저장 공간이 부족해 자동 저장하지 못했습니다. JSON으로 백업해 주세요."),
        0,
      );
    }
  }, [characters, hydrated, storageError, storageReady]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme, hydrated]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function unlockSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccessBusy(true);
    setAccessError("");
    try {
      const response = await fetch("/api/site-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: sitePassword }),
        cache: "no-store",
      });
      const result = await response.json() as { error?: unknown; authenticated?: boolean };
      if (!response.ok || result.authenticated !== true) {
        setAccessError(typeof result.error === "string" ? result.error : "사이트 잠금을 해제하지 못했습니다.");
        if (response.status === 503) setAccessState("unavailable");
        return;
      }
      setSitePassword("");
      setAccessState("unlocked");
    } catch {
      setAccessError("서버에 연결하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setAccessBusy(false);
    }
  }

  async function lockSite() {
    try {
      const response = await fetch("/api/site-access", { method: "DELETE", cache: "no-store" });
      if (!response.ok) throw new Error("사이트를 잠그지 못했습니다.");
      setSitePassword("");
      setAccessState("locked");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "사이트를 잠그지 못했습니다.");
    }
  }

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedId) ?? null,
    [characters, selectedId],
  );
  const filteredCharacters = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return characters;
    return characters.filter((character) =>
      [character.name, character.type, character.descriptor, character.focus]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [characters, search]);

  const updateCharacter = useCallback(
    (id: string, update: (character: Character) => Character) => {
      setCharacters((current) =>
        current.map((character) => {
          if (character.id !== id) return character;
          const next = update(character);
          return { ...next, updatedAt: new Date().toISOString() };
        }),
      );
    },
    [],
  );

  function startCreate() {
    setNewCharacter({
      name: "",
      ruleSet: "discovery",
      type: "",
      descriptor: "",
      focus: "",
    });
    setWizardOpen(true);
  }

  function createNewCharacter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newCharacter.name.trim();
    if (!name) return;
    const timestamp = new Date().toISOString();
    const emptyPool = () => ({ current: 0, max: 0, edge: 0 });
    const character: Character = {
      id: makeId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      name,
      playerName: "",
      ruleSet: newCharacter.ruleSet,
      type: newCharacter.type.trim(),
      descriptor: newCharacter.descriptor.trim(),
      focus: newCharacter.focus.trim(),
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
      armor: { name: "", value: 0, mightCost: 0, speedCost: 0, note: "" },
      shins: 0,
      recovery: { completed: [], result: null, bonus: 0 },
      advancements: [],
      background: { ...EMPTY_BACKGROUND },
      damageState: "hale",
      notes: "",
    };

    setCharacters((current) => [character, ...current]);
    setSelectedId(character.id);
    setWizardOpen(false);
    setView("sheet");
    setNotice("새 캐릭터를 만들었습니다. 수치는 보유한 룰북을 참고해 입력해 주세요.");
  }

  function deleteCharacter(character: Character) {
    if (!window.confirm(`"${character.name}" 캐릭터를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
    setCharacters((current) => current.filter((entry) => entry.id !== character.id));
    if (selectedId === character.id) {
      setSelectedId(null);
      setView("home");
    }
    setNotice("캐릭터를 삭제했습니다.");
  }

  function duplicateCharacter(character: Character) {
    const copy: Character = {
      ...character,
      id: makeId(),
      name: `${character.name} 사본`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats: {
        might: { ...character.stats.might },
        speed: { ...character.stats.speed },
        intellect: { ...character.stats.intellect },
      },
      skills: character.skills.map((skill) => ({ ...skill, id: makeId() })),
      abilities: character.abilities.map((entry) => ({ ...entry, id: makeId() })),
      equipment: character.equipment.map((entry) => ({ ...entry, id: makeId() })),
      cyphers: character.cyphers.map((entry) => ({ ...entry, id: makeId() })),
      attacks: character.attacks.map((entry) => ({ ...entry, id: makeId() })),
      artifacts: character.artifacts.map((entry) => ({ ...entry, id: makeId() })),
      oddities: character.oddities.map((entry) => ({ ...entry, id: makeId() })),
      recovery: { ...character.recovery, completed: [...character.recovery.completed] },
      advancements: character.advancements.map((entry) => ({ ...entry, id: makeId() })),
      background: { ...character.background },
      armor: { ...character.armor },
    };
    setCharacters((current) => [copy, ...current]);
    setSelectedId(copy.id);
    setView("sheet");
    setNotice("캐릭터를 복제했습니다.");
  }

  function downloadJson(value: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportCharacter(character: Character) {
    downloadJson(character, `${character.name.replace(/[\\/:*?"<>|]/g, "-")}.json`);
    setNotice("캐릭터 JSON을 내보냈습니다.");
  }

  function exportAll() {
    downloadJson(
      { version: 1, characters },
      "numenera-characters.json",
    );
    setNotice("캐릭터 백업 JSON을 내보냈습니다.");
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("JSON 파일은 10MB 이하만 가져올 수 있습니다.");
      }
      const imported = readCharacterImport(await file.text());
      const usedIds = new Set(characters.map((character) => character.id));
      const normalized = imported.map((character) => {
        if (usedIds.has(character.id)) {
          const copy = {
            ...character,
            id: makeId(),
            name: `${character.name} (가져옴)`,
            updatedAt: new Date().toISOString(),
          };
          usedIds.add(copy.id);
          return copy;
        }
        usedIds.add(character.id);
        return character;
      });
      setCharacters((current) => [...normalized, ...current]);
      setSelectedId(normalized[0].id);
      setView("sheet");
      try {
        await saveCharactersToGoogleSheet(normalized);
        setNotice(`${normalized.length}개 캐릭터를 가져와 Google Sheets에도 저장했습니다.`);
      } catch (syncError) {
        setNotice(`${normalized.length}개 캐릭터를 가져왔습니다. Google Sheets 저장은 실패했습니다: ${syncError instanceof Error ? syncError.message : "서버 연결을 확인해 주세요."}`);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "JSON 파일을 읽지 못했습니다.");
    } finally {
      event.target.value = "";
    }
  }

  function setStatValue(
    character: Character,
    key: StatKey,
    field: "current" | "max" | "edge",
    raw: string,
  ) {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    const value = Math.max(0, Math.min(999, parsed));
    updateCharacter(character.id, (current) => {
      const next = {
        ...current,
        stats: {
          ...current.stats,
          [key]: { ...current.stats[key], [field]: value },
        },
      };
      if (field === "max" && next.stats[key].current > value) {
        next.stats[key].current = value;
      }
      if (field === "current" && value > next.stats[key].max) {
        next.stats[key].max = value;
      }
      return next;
    });
  }

  function addCharacterEntry(
    character: Character,
    field: "abilities" | "equipment" | "cyphers" | "attacks" | "artifacts" | "oddities",
    name: string,
    description: string,
    metadata: Pick<CharacterEntry, "cost" | "modifier" | "damage" | "cypherKind"> = {},
  ) {
    const entry: CharacterEntry = { id: makeId(), name, description, ...metadata };
    updateCharacter(character.id, (current) => ({
      ...current,
      [field]: [...current[field], entry],
    }));
  }

  function addSkill(character: Character, name: string, note: string) {
    const skill: Skill = { id: makeId(), name, level: "untrained", note };
    updateCharacter(character.id, (current) => ({
      ...current,
      skills: [...current.skills, skill],
    }));
  }

  function removeEntry(
    character: Character,
    field: "skills" | "abilities" | "equipment" | "cyphers" | "attacks" | "artifacts" | "oddities",
    id: string,
  ) {
    updateCharacter(character.id, (current) => ({
      ...current,
      [field]: current[field].filter((entry) => entry.id !== id),
    }));
  }

  function updateCharacterEntry(
    character: Character,
    field: "abilities" | "equipment" | "cyphers" | "attacks" | "artifacts" | "oddities",
    id: string,
    values: Partial<CharacterEntry>,
  ) {
    updateCharacter(character.id, (current) => ({
      ...current,
      [field]: current[field].map((entry) =>
        entry.id === id ? { ...entry, ...values } : entry,
      ),
    }));
  }

  async function uploadPortrait(character: Character, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("이미지 파일만 선택할 수 있습니다.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setNotice("초상화 파일은 2MB 이하로 선택해 주세요.");
      return;
    }
    try {
      const portrait = await resizePortrait(file);
      updateCharacter(character.id, (current) => ({
        ...current,
        portrait,
        portraitFileId: undefined,
      }));
      setNotice("초상화를 저장했습니다. Google Sheets 서버 저장 시 함께 백업됩니다.");
    } catch {
      setNotice("초상화 파일을 읽지 못했습니다.");
    } finally {
      event.target.value = "";
    }
  }

  const navItems: { id: View; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] = [
    { id: "home", label: "대시보드", icon: "home" },
    { id: "sheet", label: "캐릭터", icon: "person" },
    { id: "rules", label: "규칙 데이터", icon: "book" },
    { id: "settings", label: "설정", icon: "settings" },
  ];

  if (accessState !== "unlocked") {
    return (
      <main className="access-gate">
        <section className="access-card">
          <div className="access-mark">✦</div>
          <span className="section-kicker">NINTH WORLD · PRIVATE</span>
          {accessState === "checking" ? (
            <p className="access-message">사이트 잠금 상태를 확인하고 있습니다…</p>
          ) : accessState === "unavailable" ? (
            <>
              <h1>사이트 비밀번호 설정 필요</h1>
              <p className="access-message">{accessError || "서버 환경 변수 SITE_ACCESS_PASSWORD와 Google Apps Script 설정을 확인한 뒤 서버를 다시 시작해 주세요."}</p>
            </>
          ) : (
            <>
              <h1>제9세계 캐릭터 아틀라스</h1>
              <p className="access-message">계속하려면 사이트 비밀번호를 입력하세요.</p>
              <form className="access-form" onSubmit={unlockSite}>
                <label htmlFor="site-password">사이트 비밀번호</label>
                <input
                  id="site-password"
                  type="password"
                  autoComplete="current-password"
                  value={sitePassword}
                  onChange={(event) => setSitePassword(event.target.value)}
                  required
                  autoFocus
                />
                {accessError && <p className="access-error" role="alert">{accessError}</p>}
                <button className="button button-primary" type="submit" disabled={accessBusy}>
                  {accessBusy ? "확인 중…" : "사이트 열기"}
                </button>
              </form>
              <p className="access-footnote">잠금은 7일간 유지됩니다. 비밀번호를 다른 사람과 공유하지 마세요.</p>
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setView("home"); }}>
          <span className="brand-mark"><span>✦</span></span>
          <span className="brand-copy">
            <strong>제9세계</strong>
            <small>CHARACTER ATLAS</small>
          </span>
        </a>

        <div className="nav-caption">캠페인 도구</div>
        <nav className="side-nav" aria-label="주 메뉴">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-link ${view === item.id ? "active" : ""}`}
              onClick={() => setView(item.id)}
              type="button"
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
              {item.id === "sheet" && characters.length > 0 && (
                <span className="nav-count">{characters.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />
        <div className="nav-caption side-section-head">
          <span>내 캐릭터</span>
          <button className="small-icon-button" onClick={startCreate} aria-label="캐릭터 추가" type="button">
            <Icon name="plus" size={15} />
          </button>
        </div>
        <div className="side-character-list">
          {characters.slice(0, 5).map((character) => (
            <button
              key={character.id}
              className={`side-character ${selectedId === character.id && view === "sheet" ? "selected" : ""}`}
              onClick={() => { setSelectedId(character.id); setView("sheet"); }}
              type="button"
            >
              <span className="tiny-avatar">{character.name.trim().charAt(0) || "?"}</span>
              <span className="side-character-label">
                <strong>{character.name}</strong>
                <small>{character.type || "유형 미입력"}</small>
              </span>
              <span className="tier-mini">{character.tier}등급</span>
            </button>
          ))}
          {characters.length === 0 && (
            <p className="sidebar-empty">아직 등록된 캐릭터가 없어요.</p>
          )}
        </div>

        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <span className="note-glyph">◈</span>
          <p>잊힌 세계의 비밀을<br />기록해 두세요.</p>
          <small>로컬 저장 · Google Sheets 백업 선택 가능</small>
        </div>
        <div className="profile-row">
          <div className="profile-avatar">탐</div>
          <div><strong>탐험자</strong><small>로컬 프로필</small></div>
          <span className="online-dot" />
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>누메네라</span><span className="breadcrumb-sep">/</span>
            <strong>{view === "home" ? "대시보드" : view === "sheet" ? "캐릭터 시트" : view === "rules" ? "규칙 데이터" : "설정"}</strong>
          </div>
          <div className="topbar-actions">
            <span className={`save-status ${storageError ? "save-error" : ""}`}>
              <span className="status-dot" />
              {storageError ? "저장 확인 필요" : hydrated ? "자동 저장됨" : "불러오는 중"}
            </span>
            <button
              className="theme-toggle"
              onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
              type="button"
              aria-label={theme === "light" ? "다크 모드 켜기" : "라이트 모드 켜기"}
            >
              <Icon name={theme === "light" ? "moon" : "sun"} size={17} />
            </button>
            <button className="avatar-button" type="button" onClick={() => setView("settings")} aria-label="설정 열기">탐</button>
            <button className="lock-button" type="button" onClick={lockSite}>잠금</button>
          </div>
        </header>

        <div className="page-content">
          {storageError && (
            <div className="alert alert-error" role="alert">
              <span>{storageError}</span>
              {!storageReady && (
                <button
                  type="button"
                  className="recovery-button"
                  onClick={() => {
                    if (!window.confirm("읽을 수 없는 로컬 저장 데이터를 삭제하고 빈 저장소로 시작할까요?")) return;
                    window.localStorage.removeItem(STORAGE_KEY);
                    setCharacters([]);
                    setStorageError("");
                    setStorageReady(true);
                  }}
                >
                  빈 저장소로 시작
                </button>
              )}
            </div>
          )}

          {view === "home" && (
            <>
              <section className="welcome-row">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> THE NINTH WORLD <span className="eyebrow-line" /></div>
                  <h1>낯선 세계, <em>새로운 이야기.</em></h1>
                  <p className="welcome-subtitle">캐릭터를 만들고, 여정의 기록을 한곳에 모아보세요.</p>
                </div>
                <button className="button button-primary create-button" type="button" onClick={startCreate}>
                  <Icon name="plus" size={17} /> 새 캐릭터 만들기
                </button>
              </section>

              <section className="hero-panel">
                <div className="hero-texture" />
                <div className="hero-content">
                  <span className="hero-kicker">A GUIDE TO YOUR NEXT ADVENTURE</span>
                  <h2>복잡한 기록은 가볍게,<br /><span>상상력은 더 멀리.</span></h2>
                  <p>캐릭터의 선택과 여정을 직접 기록하고 관리하는<br className="desktop-break" /> 나만의 누메네라 아틀라스.</p>
                  <button className="hero-link" type="button" onClick={startCreate}>첫 캐릭터 기록하기 <Icon name="arrow" size={16} /></button>
                </div>
                <div className="hero-orbit orbit-one" />
                <div className="hero-orbit orbit-two" />
                <div className="hero-sigil">✧</div>
                <span className="hero-corner hero-corner-tl" />
                <span className="hero-corner hero-corner-br" />
              </section>

              <section className="section-heading">
                <div>
                  <div className="section-kicker">YOUR JOURNEY</div>
                  <h2>모험가 목록 <span className="count-pill">{characters.length}</span></h2>
                </div>
                {characters.length > 0 && (
                  <button className="text-button" type="button" onClick={() => setView("sheet")}>전체 보기 <Icon name="arrow" size={15} /></button>
                )}
              </section>

              {characters.length === 0 ? (
                <section className="empty-state">
                  <div className="empty-illustration">
                    <span className="empty-sun" />
                    <span className="empty-glyph">✧</span>
                    <span className="empty-mountain mountain-one" />
                    <span className="empty-mountain mountain-two" />
                  </div>
                  <div className="empty-copy">
                    <span className="empty-overline">YOUR STORY STARTS HERE</span>
                    <h3>아직 기록된 여정이 없어요</h3>
                    <p>첫 번째 캐릭터를 만들고 제9세계의 모험을 시작해 보세요.<br />규칙 수치는 보유한 룰북을 참고해 직접 입력할 수 있어요.</p>
                    <button className="button button-outline" type="button" onClick={startCreate}>
                      캐릭터 만들기 <Icon name="arrow" size={15} />
                    </button>
                  </div>
                </section>
              ) : (
                <div className="character-grid">
                  {characters.slice(0, 3).map((character, index) => (
                    <CharacterCard
                      key={character.id}
                      character={character}
                      index={index}
                      open={() => { setSelectedId(character.id); setView("sheet"); }}
                    />
                  ))}
                </div>
              )}

              <section className="bottom-grid">
                <div className="tip-card">
                  <div className="tip-icon"><Icon name="spark" size={18} /></div>
                  <div>
                    <span className="section-kicker">FIELD NOTE</span>
                    <h3>나만의 규칙 데이터를 입력하세요</h3>
                    <p>공식 콘텐츠는 포함하지 않았어요. 보유한 룰북을 참고해 직접 기록하면 출처별로 관리할 수 있습니다.</p>
                  </div>
                  <button className="tip-arrow" type="button" onClick={() => setView("rules")} aria-label="규칙 데이터 보기"><Icon name="arrow" size={16} /></button>
                </div>
                <div className="mini-stat-card">
                  <span className="mini-stat-icon"><Icon name="person" size={17} /></span>
                  <span className="mini-stat-label">기록된 모험가</span>
                  <strong>{characters.length.toString().padStart(2, "0")}<small> 명</small></strong>
                  <span className="mini-stat-rule" />
                </div>
              </section>
            </>
          )}

          {view === "sheet" && (
            <section className="character-page">
              <div className="section-heading character-list-heading">
                <div>
                  <div className="section-kicker">CHARACTER ARCHIVE</div>
                  <h1>캐릭터 <span className="count-pill">{characters.length}</span></h1>
                </div>
                <button className="button button-primary" type="button" onClick={startCreate}><Icon name="plus" size={16} /> 새 캐릭터</button>
              </div>
              {characters.length > 1 && (
                <div className="search-field">
                  <span>⌕</span>
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름, 유형, 수식어 검색" aria-label="캐릭터 검색" />
                  {search && <button type="button" onClick={() => setSearch("")} aria-label="검색 지우기"><Icon name="close" size={15} /></button>}
                </div>
              )}

              {selectedCharacter ? (
                <CharacterSheet
                  character={selectedCharacter}
                  updateCharacter={updateCharacter}
                  setStatValue={setStatValue}
                  addSkill={addSkill}
                  addEntry={addCharacterEntry}
                  removeEntry={removeEntry}
                  updateEntry={updateCharacterEntry}
                  uploadPortrait={uploadPortrait}
                  exportCharacter={exportCharacter}
                  duplicateCharacter={duplicateCharacter}
                  deleteCharacter={deleteCharacter}
                  setNotice={setNotice}
                />
              ) : filteredCharacters.length === 0 ? (
                <section className="empty-state compact-empty">
                  <div className="empty-icon-ring"><Icon name="person" size={24} /></div>
                  <h3>{search ? "검색 결과가 없습니다" : "아직 캐릭터가 없습니다"}</h3>
                  <p>{search ? "다른 이름이나 유형으로 검색해 보세요." : "새 캐릭터를 만들어 모험을 기록해 보세요."}</p>
                  {search ? <button className="text-button" type="button" onClick={() => setSearch("")}>검색 초기화</button> : <button className="button button-primary" type="button" onClick={startCreate}><Icon name="plus" size={16} /> 캐릭터 만들기</button>}
                </section>
              ) : (
                <div className="character-grid full-grid">
                  {filteredCharacters.map((character, index) => (
                    <CharacterCard
                      key={character.id}
                      character={character}
                      index={index}
                      open={() => setSelectedId(character.id)}
                    />
                  ))}
                </div>
              )}
              {selectedCharacter && (
                <button className="text-button back-to-list" type="button" onClick={() => setSelectedId(null)}>← 캐릭터 목록으로</button>
              )}
            </section>
          )}

          {view === "rules" && <RulesView />}

          {view === "settings" && (
            <SettingsView
              theme={theme}
              setTheme={setTheme}
              importInput={importInput}
              exportAll={exportAll}
              characterCount={characters.length}
              characters={characters}
              setCharacters={setCharacters}
              setNotice={setNotice}
            />
          )}
        </div>

        <footer className="page-footer">
          <span><span className="footer-mark">✦</span> 제9세계 캐릭터 아틀라스</span>
          <span>팬 제작 도구 · 공식 제품이 아닙니다</span>
        </footer>
      </main>

      {wizardOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setWizardOpen(false); }}>
          <form className="create-modal" onSubmit={createNewCharacter} aria-labelledby="create-title">
            <div className="modal-head">
              <div className="modal-emblem"><Icon name="spark" size={22} /></div>
              <button className="icon-button" type="button" onClick={() => setWizardOpen(false)} aria-label="닫기"><Icon name="close" size={18} /></button>
            </div>
            <div className="section-kicker">NEW ADVENTURER · 01 / 01</div>
            <h2 id="create-title">누구의 이야기를<br /><em>기록할까요?</em></h2>
            <p className="modal-intro">기본 정보를 입력해 주세요. 유형·수식어·특징과 수치는 보유한 룰북을 참고해 직접 입력합니다.</p>
            <label className="field-label" htmlFor="character-name">캐릭터 이름 <span>*</span></label>
            <input
              id="character-name"
              className="text-input"
              autoFocus
              required
              maxLength={60}
              placeholder="예: 아홉 번째 별을 찾는 사람"
              value={newCharacter.name}
              onChange={(event) => setNewCharacter((current) => ({ ...current, name: event.target.value }))}
            />
            <label className="field-label" htmlFor="ruleset">사용 룰북</label>
            <select
              id="ruleset"
              className="text-input"
              value={newCharacter.ruleSet}
              onChange={(event) => setNewCharacter((current) => ({ ...current, ruleSet: event.target.value as RuleSet }))}
            >
              <option value="discovery">Numenera Discovery</option>
              <option value="discovery-destiny">Discovery + Destiny</option>
            </select>
            <div className="form-two-col">
              <div>
                <label className="field-label" htmlFor="character-type">유형 <small>직접 입력</small></label>
                <input id="character-type" className="text-input" maxLength={60} placeholder="유형 입력" value={newCharacter.type} onChange={(event) => setNewCharacter((current) => ({ ...current, type: event.target.value }))} />
              </div>
              <div>
                <label className="field-label" htmlFor="character-descriptor">수식어 <small>직접 입력</small></label>
                <input id="character-descriptor" className="text-input" maxLength={60} placeholder="수식어 입력" value={newCharacter.descriptor} onChange={(event) => setNewCharacter((current) => ({ ...current, descriptor: event.target.value }))} />
              </div>
            </div>
            <label className="field-label" htmlFor="character-focus">특징 <small>직접 입력</small></label>
            <input id="character-focus" className="text-input" maxLength={100} placeholder="특징 입력" value={newCharacter.focus} onChange={(event) => setNewCharacter((current) => ({ ...current, focus: event.target.value }))} />
            <div className="modal-note"><Icon name="shield" size={16} /><span>룰북 콘텐츠와 수치는 포함하지 않습니다. 캐릭터 생성 후 직접 입력할 수 있습니다.</span></div>
            <button className="button button-primary modal-submit" type="submit" disabled={!newCharacter.name.trim()}>캐릭터 시트 만들기 <Icon name="arrow" size={16} /></button>
          </form>
        </div>
      )}

      {notice && <div className="toast" role="status"><Icon name={notice.includes("못했습니다") || notice.includes("올바르지") ? "close" : "check"} size={16} />{notice}</div>}
      <input ref={importInput} className="sr-only" type="file" accept="application/json,.json" onChange={importJson} />
    </div>
  );
}

async function resizePortrait(file: File): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const preview = new Image();
    preview.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(preview);
    };
    preview.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지를 읽을 수 없습니다."));
    };
    preview.src = objectUrl;
  });
  const maximumSize = 800;
  const scale = Math.min(1, maximumSize / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지를 처리할 수 없습니다.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function CharacterCard({
  character,
  index,
  open,
}: {
  character: Character;
  index: number;
  open: () => void;
}) {
  const initials = character.name.trim().slice(0, 1) || "?";
  const classes = ["character-art art-amber", "character-art art-teal", "character-art art-violet"];
  return (
    <button className="character-card" type="button" onClick={open}>
      <div className={classes[index % classes.length]}>
        <span className="art-ring" /><span className="art-symbol">{initials}</span>
        <span className="art-label">{character.tier}등급</span>
        <span className="art-corner">✧</span>
      </div>
      <div className="character-card-body">
        <div className="character-card-top">
          <div><span className="character-type">{character.type || "유형 미입력"}</span><h3>{character.name}</h3></div>
          <span className="card-arrow"><Icon name="arrow" size={15} /></span>
        </div>
        <p>{character.descriptor || "수식어 미입력"}{character.focus ? ` · ${character.focus}` : ""}</p>
        <div className="character-card-footer"><span>{character.ruleSet === "discovery" ? "DISCOVERY" : "DISCOVERY + DESTINY"}</span><span>{formatDate(character.updatedAt)}</span></div>
      </div>
    </button>
  );
}

function CharacterSheet({
  character,
  updateCharacter,
  setStatValue,
  addSkill,
  addEntry,
  removeEntry,
  updateEntry,
  uploadPortrait,
  exportCharacter,
  duplicateCharacter,
  deleteCharacter,
  setNotice,
}: {
  character: Character;
  updateCharacter: (id: string, update: (character: Character) => Character) => void;
  setStatValue: (character: Character, key: StatKey, field: "current" | "max" | "edge", raw: string) => void;
  addSkill: (character: Character, name: string, note: string) => void;
  addEntry: (character: Character, field: "abilities" | "equipment" | "cyphers" | "attacks" | "artifacts" | "oddities", name: string, description: string, metadata?: Pick<CharacterEntry, "cost" | "modifier" | "damage" | "cypherKind">) => void;
  removeEntry: (character: Character, field: "skills" | "abilities" | "equipment" | "cyphers" | "attacks" | "artifacts" | "oddities", id: string) => void;
  updateEntry: (character: Character, field: "abilities" | "equipment" | "cyphers" | "attacks" | "artifacts" | "oddities", id: string, values: Partial<CharacterEntry>) => void;
  uploadPortrait: (character: Character, event: ChangeEvent<HTMLInputElement>) => void;
  exportCharacter: (character: Character) => void;
  duplicateCharacter: (character: Character) => void;
  deleteCharacter: (character: Character) => void;
  setNotice: (message: string) => void;
}) {
  const errors = validateCharacter(character);
  const portraitInput = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"sheet" | "details">("sheet");

  function patch(values: Partial<Character>) {
    updateCharacter(character.id, (current) => ({ ...current, ...values }));
  }

  function changeSkill(id: string, values: Partial<Skill>) {
    updateCharacter(character.id, (current) => ({
      ...current,
      skills: current.skills.map((skill) => skill.id === id ? { ...skill, ...values } : skill),
    }));
  }

  function toggleCypher(entry: CharacterEntry) {
    updateCharacter(character.id, (current) => ({
      ...current,
      cyphers: current.cyphers.map((item) => item.id === entry.id ? { ...item, used: !item.used } : item),
    }));
  }

  function setRecoveryOpportunity(opportunity: RecoveryOpportunity) {
    updateCharacter(character.id, (current) => {
      const completed = current.recovery.completed.includes(opportunity)
        ? current.recovery.completed.filter((item) => item !== opportunity)
        : [...current.recovery.completed, opportunity];
      return { ...current, recovery: { ...current.recovery, completed } };
    });
  }

  function adjustPool(key: StatKey, amount: number) {
    const next = Math.max(0, Math.min(character.stats[key].max, character.stats[key].current + amount));
    setStatValue(character, key, "current", String(next));
  }

  const backgroundFields: {
    key: keyof Character["background"];
    label: string;
    placeholder: string;
  }[] = [
    { key: "origin", label: "출신", placeholder: "어디에서 왔나요?" },
    { key: "appearance", label: "외형", placeholder: "첫인상과 특징" },
    { key: "personality", label: "성격", placeholder: "성향과 태도" },
    { key: "history", label: "과거", placeholder: "지나온 삶과 중요한 사건" },
    { key: "motivation", label: "모험하는 이유", placeholder: "왜 여정을 떠났나요?" },
    { key: "goal", label: "목표", placeholder: "이루고 싶은 일" },
    { key: "secret", label: "비밀", placeholder: "숨기고 있는 사실" },
    { key: "connections", label: "관계", placeholder: "동료·NPC·세력과의 관계" },
  ];

  return (
    <div className="sheet-layout">
      <div className="sheet-main">
        <section className="sheet-hero">
          <div className="sheet-avatar">
            {character.portrait ? <div className="portrait-image" style={{ backgroundImage: `url("${character.portrait}")` }} /> : <span>{character.name.trim().slice(0, 1) || "?"}</span>}
            <button className="portrait-edit" type="button" onClick={() => portraitInput.current?.click()} aria-label="초상화 업로드">＋</button>
            <input ref={portraitInput} className="sr-only" type="file" accept="image/*" onChange={(event) => uploadPortrait(character, event)} />
          </div>
          <div className="sheet-identity">
            <div className="sheet-meta"><span className="tag tag-rule">{character.ruleSet === "discovery" ? "DISCOVERY" : "DISCOVERY + DESTINY"}</span><span className="meta-dot" /> <span>생성 {formatDate(character.createdAt)}</span></div>
            <input className="sheet-name-input" aria-label="캐릭터 이름" maxLength={60} value={character.name} onChange={(event) => patch({ name: event.target.value })} />
            <div className="sheet-player-field">
              <label htmlFor={`player-name-${character.id}`}>플레이어</label>
              <input
                id={`player-name-${character.id}`}
                className="sheet-player-input"
                aria-label="플레이어 이름"
                maxLength={60}
                value={character.playerName}
                onChange={(event) => patch({ playerName: event.target.value })}
                placeholder="플레이어 이름"
              />
            </div>
            <p className="sheet-identity-line">{getCharacterIdentity(character)}</p>
            <div className="sheet-tags">
              {character.type && <span>{character.type}</span>}
              {character.descriptor && <span>{character.descriptor}</span>}
              {character.focus && <span>{character.focus}</span>}
              {!character.type && !character.descriptor && !character.focus && <span className="muted-tag">정체성 정보를 입력해 주세요</span>}
            </div>
          </div>
          <div className="sheet-actions">
            <button className="icon-button" type="button" onClick={() => exportCharacter(character)} aria-label="캐릭터 내보내기" title="JSON 내보내기"><Icon name="download" size={17} /></button>
            <button className="icon-button" type="button" onClick={() => duplicateCharacter(character)} aria-label="캐릭터 복제" title="캐릭터 복제"><Icon name="copy" size={17} /></button>
            <button className="icon-button danger-quiet" type="button" onClick={() => deleteCharacter(character)} aria-label="캐릭터 삭제" title="캐릭터 삭제"><Icon name="trash" size={17} /></button>
          </div>
        </section>

        <div className="sheet-tab-row">
          <button type="button" className={activeTab === "sheet" ? "active" : ""} onClick={() => setActiveTab("sheet")}>플레이 시트</button>
          <button type="button" className={activeTab === "details" ? "active" : ""} onClick={() => setActiveTab("details")}>배경 및 메모</button>
          <span className="last-saved">변경 사항 자동 저장</span>
        </div>

        {activeTab === "sheet" ? (
          <>
            <div className="sheet-overview-grid">
              <section className="resource-card">
                <div className="card-heading"><div><span className="section-kicker">STATS / STAT POOLS</span><h2>특성치 / 역량</h2></div><span className="card-heading-mark">◈</span></div>
                <p className="helper-text">힘·속력·지성의 역량 현재치와 최대치, 재능을 따로 기록합니다.</p>
                <div className="stat-list">
                  {STAT_KEYS.map((key) => {
                    const stat = character.stats[key];
                    const ratio = stat.max > 0 ? Math.max(0, Math.min(100, (stat.current / stat.max) * 100)) : 0;
                    return (
                      <div className={`stat-row stat-${key}`} key={key}>
                        <div className="stat-topline">
                          <div className="stat-name"><span className="stat-gem">{key === "might" ? "◆" : key === "speed" ? "◇" : "✦"}</span><span><strong>{STAT_LABELS[key].ko}</strong><small>{STAT_LABELS[key].en}</small></span></div>
                          <div className="stat-inputs">
                            <label><span>현재</span><input aria-label={`${STAT_LABELS[key].ko} 현재 풀`} type="number" min="0" max={stat.max} value={stat.current} onChange={(event) => setStatValue(character, key, "current", event.target.value)} /></label>
                            <span className="stat-slash">/</span>
                            <label><span>최대</span><input aria-label={`${STAT_LABELS[key].ko} 최대 풀`} type="number" min="0" value={stat.max} onChange={(event) => setStatValue(character, key, "max", event.target.value)} /></label>
                            <label className="edge-input"><span>재능</span><input aria-label={`${STAT_LABELS[key].ko} 재능`} type="number" min="0" value={stat.edge} onChange={(event) => setStatValue(character, key, "edge", event.target.value)} /></label>
                          </div>
                        </div>
                        <div className="pool-bar"><span style={{ width: `${ratio}%` }} /></div>
                        <div className="pool-controls"><span>{stat.current} / {stat.max} 풀</span><div><button type="button" onClick={() => adjustPool(key, -1)} aria-label={`${STAT_LABELS[key].ko} 감소`} disabled={stat.current <= 0}>−</button><button type="button" onClick={() => adjustPool(key, 1)} aria-label={`${STAT_LABELS[key].ko} 회복`} disabled={stat.current >= stat.max}>＋</button></div></div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="progress-card">
                <div className="card-heading"><div><span className="section-kicker">ADVENTURE STATUS</span><h2>성장과 상태</h2></div><span className="card-heading-mark">✧</span></div>
                <div className="progress-fields">
                  <label><span>등급 <small>TIER · 1–6</small></span><input type="number" min="1" max="6" value={character.tier} aria-label="등급" onChange={(event) => patch({ tier: Math.max(1, Math.min(6, Number(event.target.value) || 1)) })} /></label>
                  <label><span>경험치 <small>XP</small></span><input type="number" min="0" value={character.xp} aria-label="경험치" onChange={(event) => patch({ xp: Math.max(0, Number(event.target.value) || 0) })} /></label>
                  <label><span>분발 <small>EFFORT</small></span><input type="number" min="0" max="10" value={character.effort} aria-label="분발" onChange={(event) => patch({ effort: Math.max(0, Math.min(10, Number(event.target.value) || 0)) })} /></label>
                </div>
                <label className="status-select-label" htmlFor="damage-state">부상 트랙</label>
                <select id="damage-state" className="status-select" value={character.damageState} onChange={(event) => patch({ damageState: event.target.value as DamageState })}>
                  {DAMAGE_TRACK_STATES.map((key) => <option key={key} value={key}>{DAMAGE_LABELS[key]}</option>)}
                  <option value="dead">사망 (별도 기록)</option>
                </select>
                <div className={`damage-track damage-${character.damageState}`}>
                  {DAMAGE_TRACK_STATES.map((key, index) => (
                    <button key={key} type="button" onClick={() => patch({ damageState: key as DamageState })} className={character.damageState === key ? "current" : ""} aria-label={`상태: ${DAMAGE_LABELS[key]}`}>
                      <span>{index === 0 ? "●" : index === 1 ? "◐" : "◒"}</span><small>{DAMAGE_LABELS[key]}</small>
                    </button>
                  ))}
                </div>
                <div className="progress-note"><Icon name="shield" size={15} /><span>부상 트랙에 따른 규칙 효과는 룰북을 확인해 적용하세요.</span></div>
              </section>
            </div>

            <div className="armor-possessions-grid">
              <section className="content-card armor-card">
                <div className="content-card-header">
                  <div className="content-heading-icon"><Icon name="shield" size={17} /></div>
                  <div className="content-heading-title"><h3>방어구</h3><span>ARMOR</span></div>
                </div>
                <div className="armor-fields">
                  <label className="armor-name-field"><span>방어구 이름</span><input value={character.armor.name} maxLength={100} placeholder="이름" onChange={(event) => updateCharacter(character.id, (current) => ({ ...current, armor: { ...current.armor, name: event.target.value } }))} /></label>
                  <label><span>방어 수치</span><input type="number" min="0" value={character.armor.value} onChange={(event) => updateCharacter(character.id, (current) => ({ ...current, armor: { ...current.armor, value: Math.max(0, Number(event.target.value) || 0) } }))} /></label>
                  <label><span>힘 비용</span><input type="number" min="0" value={character.armor.mightCost} onChange={(event) => updateCharacter(character.id, (current) => ({ ...current, armor: { ...current.armor, mightCost: Math.max(0, Number(event.target.value) || 0) } }))} /></label>
                  <label><span>속력 비용</span><input type="number" min="0" value={character.armor.speedCost} onChange={(event) => updateCharacter(character.id, (current) => ({ ...current, armor: { ...current.armor, speedCost: Math.max(0, Number(event.target.value) || 0) } }))} /></label>
                  <label className="armor-name-field"><span>페널티 · 효과</span><input value={character.armor.note} maxLength={300} placeholder="룰북에 따른 페널티나 효과" onChange={(event) => updateCharacter(character.id, (current) => ({ ...current, armor: { ...current.armor, note: event.target.value } }))} /></label>
                </div>
                <p className="helper-text">방어 수치와 힘·속력 비용을 별도로 기록합니다. 피해 적용은 룰북을 확인해 주세요.</p>
              </section>
              <section className="content-card possessions-card">
                <div className="content-card-header">
                  <div className="content-heading-icon"><Icon name="box" size={17} /></div>
                  <div className="content-heading-title"><h3>재산</h3><span>POSSESSIONS</span></div>
                </div>
                <label className="shins-field"><span>쉰 <small>SHINS</small></span><input aria-label="쉰" type="number" min="0" value={character.shins} onChange={(event) => updateCharacter(character.id, (current) => ({ ...current, shins: Math.max(0, Number(event.target.value) || 0) }))} /></label>
                <p className="helper-text">쉰은 수동으로 증감합니다. 장비는 소지품 목록에 기록하세요.</p>
              </section>
            </div>

            {errors.length > 0 && (
              <div className="validation-notice">
                <div className="validation-icon"><Icon name="spark" size={17} /></div>
                <div><strong>기록을 완성하려면 확인이 필요해요</strong><p>{errors.slice(0, 4).join(" · ")}{errors.length > 4 ? ` 외 ${errors.length - 4}개` : ""}</p></div>
              </div>
            )}

            <div className="content-grid">
              <ContentCard title="기능" english="SKILLS" count={character.skills.length} icon="spark">
                <p className="helper-text">기능 수준과 효과 출처를 기록합니다. 익숙함·능숙함의 난이도 효과는 직접 확인해 주세요.</p>
                {character.skills.length > 0 ? (
                  <div className="entry-list">
                    {character.skills.map((skill) => (
                      <div className="skill-entry" key={skill.id}>
                        <div className="entry-icon skill-icon">✧</div>
                        <div className="entry-main"><strong>{skill.name}</strong><small>{skill.note || "출처 또는 적용 범위를 기록하세요"}</small></div>
                        <select aria-label={`${skill.name} 숙련 수준`} value={skill.level} onChange={(event) => changeSkill(skill.id, { level: event.target.value as SkillLevel })}>
                          {Object.entries(SKILL_LEVEL_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                        <button className="entry-remove" type="button" onClick={() => removeEntry(character, "skills", skill.id)} aria-label={`${skill.name} 삭제`}><Icon name="close" size={15} /></button>
                      </div>
                    ))}
                  </div>
                ) : <EmptyInline>아직 등록한 기능이 없습니다.</EmptyInline>}
                <QuickAdd label="기능" onAdd={(name, note) => addSkill(character, name, note)} descriptionPlaceholder="출처 또는 적용 범위" />
              </ContentCard>

              <ContentCard title={getAbilityCategory(character.type).ko} english={getAbilityCategory(character.type).en} count={character.abilities.length} icon="spark">
                <p className="helper-text">능력 비용과 사용 조건·사용 여부를 함께 기록합니다.</p>
                {character.abilities.length > 0 ? (
                  <div className="entry-list">
                    {character.abilities.map((ability) => (
                      <div className={`entry-row ability-row ${ability.used ? "entry-used" : ""}`} key={ability.id}>
                        <button type="button" className={`used-toggle ${ability.used ? "checked" : ""}`} onClick={() => updateEntry(character, "abilities", ability.id, { used: !ability.used })} aria-label={ability.used ? "능력 미사용으로 표시" : "능력 사용 완료 표시"}>{ability.used && <Icon name="check" size={12} />}</button>
                        <div className="entry-main">
                          <strong>{ability.name}</strong>
                          <input aria-label={`${ability.name} 사용 조건`} value={ability.description} placeholder="사용 조건 · 효과" maxLength={300} onChange={(event) => updateEntry(character, "abilities", ability.id, { description: event.target.value })} />
                        </div>
                        <label className="ability-cost"><span>비용</span><input aria-label={`${ability.name} 비용`} value={ability.cost ?? ""} placeholder="—" maxLength={40} onChange={(event) => updateEntry(character, "abilities", ability.id, { cost: event.target.value })} /></label>
                        <button className="entry-remove" type="button" onClick={() => removeEntry(character, "abilities", ability.id)} aria-label={`${ability.name} 삭제`}><Icon name="close" size={15} /></button>
                      </div>
                    ))}
                  </div>
                ) : <EmptyInline>아직 등록한 능력이 없습니다.</EmptyInline>}
                <AbilityQuickAdd onAdd={(name, cost, description) => addEntry(character, "abilities", name, description, { cost })} />
              </ContentCard>

              <ContentCard title="장비" english="EQUIPMENT" count={character.equipment.length} icon="box">
                <p className="helper-text">무기, 방어구, 일반 장비와 소지품을 기록합니다.</p>
                <EntryList entries={character.equipment} empty="아직 등록한 장비가 없습니다." onRemove={(id) => removeEntry(character, "equipment", id)} onDescription={(id, value) => updateEntry(character, "equipment", id, { description: value })} />
                <QuickAdd label="장비" onAdd={(name, description) => addEntry(character, "equipment", name, description)} descriptionPlaceholder="분류 · 수량 · 효과" />
              </ContentCard>

              <ContentCard title="공격" english="ATTACKS · MOD / DMG" count={character.attacks.length} icon="shield">
                <p className="helper-text">공격 보정과 피해, 사거리·효과를 기록합니다. 고정 보너스 계산은 하지 않습니다.</p>
                {character.attacks.map((attack) => (
              <div className="entry-row attack-entry" key={attack.id}>
                <div className="entry-main"><strong>{attack.name}</strong><input aria-label={`${attack.name} 메모`} value={attack.description} placeholder="사거리 · 효과 · 메모" maxLength={300} onChange={(event) => updateEntry(character, "attacks", attack.id, { description: event.target.value })} /></div>
                <label className="attack-value"><span>보정</span><input aria-label={`${attack.name} 보정`} value={attack.modifier ?? ""} placeholder="—" maxLength={40} onChange={(event) => updateEntry(character, "attacks", attack.id, { modifier: event.target.value })} /></label>
                <label className="attack-value"><span>피해</span><input aria-label={`${attack.name} 피해`} value={attack.damage ?? ""} placeholder="—" maxLength={40} onChange={(event) => updateEntry(character, "attacks", attack.id, { damage: event.target.value })} /></label>
                <button className="entry-remove" type="button" onClick={() => removeEntry(character, "attacks", attack.id)} aria-label={`${attack.name} 삭제`}><Icon name="close" size={15} /></button>
              </div>
                ))}
                {character.attacks.length === 0 && <EmptyInline>아직 등록한 공격이 없습니다.</EmptyInline>}
                <AttackQuickAdd onAdd={(name, modifier, damage, description) => addEntry(character, "attacks", name, description, { modifier, damage })} />
              </ContentCard>

              <ContentCard title="사이퍼" english="CYPHERS · 급용 / 절차" count={character.cyphers.filter((entry) => !entry.used).length} icon="spark">
                <div className="cypher-limit-row">
                  <span>사이퍼 한도</span>
                  <input aria-label="사이퍼 한도" type="number" min="0" value={character.cypherLimit} onChange={(event) => updateCharacter(character.id, (current) => ({ ...current, cypherLimit: Math.max(0, Number(event.target.value) || 0) }))} />
                  <strong>{character.cyphers.filter((entry) => !entry.used).reduce((total, entry) => total + (entry.cypherKind === "procedural" ? 2 : 1), 0)} / {character.cypherLimit}</strong>
                </div>
                <p className="helper-text">급용 사이퍼는 1개, 절차 사이퍼는 2개로 계산해 표시합니다.</p>
                {character.cyphers.length > 0 ? (
                  <div className="entry-list">
                    {character.cyphers.map((entry) => (
                      <div className={`entry-row ${entry.used ? "entry-used" : ""}`} key={entry.id}>
                        <button type="button" className={`used-toggle ${entry.used ? "checked" : ""}`} onClick={() => toggleCypher(entry)} aria-label={entry.used ? "미사용으로 변경" : "사용 완료 처리"}>{entry.used && <Icon name="check" size={12} />}</button>
                        <div className="entry-icon cypher-icon"><Icon name="spark" size={15} /></div>
                        <div className="entry-main"><strong>{entry.name} <small className="inline-kind">{entry.cypherKind === "procedural" ? "절차" : "급용"}</small></strong><input aria-label={`${entry.name} 설명`} value={entry.description} placeholder="레벨 · 효과 · 메모" maxLength={300} onChange={(event) => updateEntry(character, "cyphers", entry.id, { description: event.target.value })} /></div>
                        <button className="entry-remove" type="button" onClick={() => removeEntry(character, "cyphers", entry.id)} aria-label={`${entry.name} 삭제`}><Icon name="close" size={15} /></button>
                      </div>
                    ))}
                  </div>
                ) : <EmptyInline>아직 등록한 사이퍼가 없습니다.</EmptyInline>}
                <CypherQuickAdd onAdd={(name, description, cypherKind) => {
                  const entry: CharacterEntry = { id: makeId(), name, description, cypherKind };
                  updateCharacter(character.id, (current) => ({ ...current, cyphers: [...current.cyphers, entry] }));
                }} />
                {character.cypherLimit > 0 && character.cyphers.filter((entry) => !entry.used).reduce((total, entry) => total + (entry.cypherKind === "procedural" ? 2 : 1), 0) > character.cypherLimit && <div className="soft-warning">사이퍼 한도를 초과했습니다. 룰북 기준을 확인해 주세요.</div>}
              </ContentCard>

              <ContentCard title="아티팩트" english="ARTIFACTS" count={character.artifacts.length} icon="box">
                <p className="helper-text">반복 사용 가능한 초고대 기술 물품과 고갈·사용 정보를 기록합니다.</p>
                <EntryList entries={character.artifacts} empty="아직 등록한 아티팩트가 없습니다." onRemove={(id) => removeEntry(character, "artifacts", id)} onDescription={(id, value) => updateEntry(character, "artifacts", id, { description: value })} />
                <QuickAdd label="아티팩트" onAdd={(name, description) => addEntry(character, "artifacts", name, description)} descriptionPlaceholder="레벨 · 효과 · 고갈 정보" />
              </ContentCard>

              <ContentCard title="신기품" english="ODDITIES" count={character.oddities.length} icon="spark">
                <p className="helper-text">실용성이 확인되지 않은 기이한 물건과 발견 장소를 기록합니다.</p>
                <EntryList entries={character.oddities} empty="아직 등록한 신기품이 없습니다." onRemove={(id) => removeEntry(character, "oddities", id)} onDescription={(id, value) => updateEntry(character, "oddities", id, { description: value })} />
                <QuickAdd label="신기품" onAdd={(name, description) => addEntry(character, "oddities", name, description)} descriptionPlaceholder="외형 · 발견 장소 · 메모" />
              </ContentCard>

              <RecoveryPanel character={character} updateCharacter={updateCharacter} setRecoveryOpportunity={setRecoveryOpportunity} />
              <AdvancementPanel character={character} updateCharacter={updateCharacter} setNotice={setNotice} />
            </div>
          </>
        ) : (
          <div className="details-card">
            <div className="card-heading"><div><span className="section-kicker">CHARACTER JOURNAL</span><h2>배경과 관계</h2></div><span className="card-heading-mark">✧</span></div>
            <p className="helper-text">캐릭터의 이야기와 동료, 인물, 세력과의 연결고리를 기록합니다.</p>
            <div className="background-form-grid">
              {backgroundFields.map((field) => (
                <label className="background-field" key={field.key}>
                  <span>{field.label}</span>
                  <textarea maxLength={1500} value={character.background[field.key]} placeholder={field.placeholder} onChange={(event) => patch({ background: { ...character.background, [field.key]: event.target.value } })} />
                </label>
              ))}
            </div>
            <label className="background-field free-notes">
              <span>자유 메모</span>
              <textarea className="notes-editor" aria-label="캐릭터 배경과 메모" maxLength={12000} value={character.notes} onChange={(event) => patch({ notes: event.target.value })} placeholder={"이야기를 적어 두세요.\n\n출신 · 외형 · 성격 · 과거 · 목표 · 비밀 · 다른 인물과의 관계"} />
            </label>
            <div className="notes-footer"><span>기기에 자동 저장됩니다</span><span>{character.notes.length.toLocaleString()} / 12,000</span></div>
          </div>
        )}
      </div>

      <aside className="sheet-aside">
        <div className="aside-card identity-card">
          <span className="aside-ornament">✧</span>
          <span className="section-kicker">CHARACTER IDENTITY</span>
          <p>“{getCharacterIdentity(character)}”</p>
          <div className="identity-divider" />
          <div className="identity-details"><span>룰북</span><strong>{character.ruleSet === "discovery" ? "Discovery" : "Discovery + Destiny"}</strong></div>
          <div className="identity-details"><span>등급</span><strong>{character.tier}</strong></div>
          <div className="identity-details"><span>분발</span><strong>{character.effort}</strong></div>
          <div className="identity-details"><span>경험치</span><strong>{character.xp} XP</strong></div>
        </div>
        <div className="aside-card checklist-card">
          <div className="aside-title"><span className="section-kicker">SHEET CHECK</span><span className="check-count">{errors.length === 0 ? "완료" : `${errors.length} 항목`}</span></div>
          <h3>캐릭터 기록</h3>
          <div className="check-list">
            {[
              ["이름", Boolean(character.name.trim())],
              ["유형", Boolean(character.type.trim())],
              ["수식어", Boolean(character.descriptor.trim())],
              ["특징", Boolean(character.focus.trim())],
              ["특성치 역량", STAT_KEYS.every((key) => character.stats[key].max > 0)],
            ].map(([label, complete]) => (
              <div className="check-row" key={String(label)}><span className={`check-mark ${complete ? "done" : ""}`}>{complete && <Icon name="check" size={11} />}</span><span>{label}</span><small>{complete ? "기록됨" : "입력 필요"}</small></div>
            ))}
          </div>
          <p className="check-disclaimer">이 항목은 입력 여부만 확인합니다. 규칙 적합성은 보유한 룰북을 참고해 주세요.</p>
        </div>
        <div className="aside-tip"><span>FIELD GUIDE</span><p>규칙 효과는 유형·수식어·특징별로 출처를 함께 메모하면 나중에 수정하기 편합니다.</p></div>
        <button className="aside-export" type="button" onClick={() => exportCharacter(character)}><Icon name="download" size={16} /> 캐릭터 JSON 백업</button>
        <button className="aside-print" type="button" onClick={() => { window.print(); setNotice("인쇄 대화상자를 열었습니다."); }}>인쇄 / PDF 저장</button>
        <span className="aside-version">마지막 수정 {formatDate(character.updatedAt)}</span>
      </aside>
    </div>
  );
}

function RecoveryPanel({
  character,
  updateCharacter,
  setRecoveryOpportunity,
}: {
  character: Character;
  updateCharacter: (id: string, update: (character: Character) => Character) => void;
  setRecoveryOpportunity: (opportunity: RecoveryOpportunity) => void;
}) {
  return (
    <ContentCard title="회복 굴림" english="RECOVERY ROLLS" count={character.recovery.completed.length} icon="spark">
      <p className="helper-text">회복 기회를 사용한 뒤 표시하고, 실제 회복 결과를 기록하세요. 주사위 공식은 자동 적용하지 않습니다.</p>
      <div className="recovery-list">
        {RECOVERY_OPPORTUNITIES.map((opportunity) => {
          const completed = character.recovery.completed.includes(opportunity.id);
          return (
            <label className={`recovery-option ${completed ? "completed" : ""}`} key={opportunity.id}>
              <input type="checkbox" checked={completed} onChange={() => setRecoveryOpportunity(opportunity.id)} />
              <span className="recovery-check">{completed && <Icon name="check" size={12} />}</span>
              <span>{opportunity.label}</span>
            </label>
          );
        })}
      </div>
      <div className="recovery-result-row">
        <label><span>회복 굴림 보너스</span><input type="number" min="0" aria-label="회복 굴림 보너스" value={character.recovery.bonus} onChange={(event) => updateCharacter(character.id, (current) => ({ ...current, recovery: { ...current.recovery, bonus: Math.max(0, Number(event.target.value) || 0) } }))} /></label>
        <label><span>굴림 / 회복량</span><input type="number" min="0" aria-label="회복 굴림 결과" value={character.recovery.result ?? ""} placeholder="직접 기록" onChange={(event) => updateCharacter(character.id, (current) => ({ ...current, recovery: { ...current.recovery, result: event.target.value === "" ? null : Math.max(0, Number(event.target.value) || 0) } }))} /></label>
      </div>
      <button className="recovery-reset" type="button" onClick={() => updateCharacter(character.id, (current) => ({ ...current, recovery: { ...current.recovery, completed: [], result: null } }))}>회복 주기 초기화</button>
    </ContentCard>
  );
}

function AdvancementPanel({
  character,
  updateCharacter,
  setNotice,
}: {
  character: Character;
  updateCharacter: (id: string, update: (character: Character) => Character) => void;
  setNotice: (message: string) => void;
}) {
  const [choice, setChoice] = useState<AdvancementChoice>("pool");
  const [poolPoints, setPoolPoints] = useState<Record<StatKey, string>>({
    might: "4",
    speed: "0",
    intellect: "0",
  });
  const [edgeTarget, setEdgeTarget] = useState<StatKey>("might");
  const [skillId, setSkillId] = useState("");
  const [otherDetail, setOtherDetail] = useState("");
  const tierAdvancements = character.advancements.filter((entry) => entry.tier === character.tier);
  const completedChoices = new Set(tierAdvancements.map((entry) => entry.choice));
  const remainingSlots = Math.max(0, 4 - tierAdvancements.length);
  const skillOptions = character.skills.filter((skill) => skill.level !== "specialized");

  function addAdvancement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (character.xp < 4) {
      setNotice("성장 선택에는 4 XP가 필요합니다.");
      return;
    }
    if (remainingSlots === 0) {
      setNotice("현재 등급의 성장 선택 4개를 모두 완료했습니다.");
      return;
    }
    if (choice !== "other" && completedChoices.has(choice)) {
      setNotice("현재 등급에서 이미 완료한 성장 선택입니다.");
      return;
    }

    let detail = "";
    let target: StatKey | undefined;
    let selectedSkillId: string | undefined;
    let updatedStats = character.stats;
    let effort = character.effort;

    if (choice === "pool") {
      const points = Object.fromEntries(
        STAT_KEYS.map((key) => [key, Number(poolPoints[key]) || 0]),
      ) as Record<StatKey, number>;
      if (STAT_KEYS.some((key) => !Number.isInteger(points[key]) || points[key] < 0) ||
        STAT_KEYS.reduce((sum, key) => sum + points[key], 0) !== 4) {
        setNotice("능력치 향상은 힘·속력·지성에 합계 4점을 배분해야 합니다.");
        return;
      }
      updatedStats = {
        ...character.stats,
        might: { ...character.stats.might, max: character.stats.might.max + points.might },
        speed: { ...character.stats.speed, max: character.stats.speed.max + points.speed },
        intellect: { ...character.stats.intellect, max: character.stats.intellect.max + points.intellect },
      };
      detail = STAT_KEYS.filter((key) => points[key] > 0)
        .map((key) => `${STAT_LABELS[key].ko} +${points[key]}`)
        .join(", ");
    } else if (choice === "edge") {
      target = edgeTarget;
      detail = `${STAT_LABELS[target].ko} 재능 +1`;
      updatedStats = {
        ...character.stats,
        [target]: { ...character.stats[target], edge: character.stats[target].edge + 1 },
      };
    } else if (choice === "effort") {
      effort += 1;
      detail = "분발 +1";
    } else if (choice === "skill") {
      const skill = skillOptions.find((entry) => entry.id === skillId);
      if (!skill) {
        setNotice("훈련할 기능을 선택해 주세요.");
        return;
      }
      selectedSkillId = skill.id;
      detail = skill.level === "trained"
        ? `${skill.name}: 익숙함 → 능숙함`
        : `${skill.name}: ${SKILL_LEVEL_LABELS[skill.level]} → 익숙함`;
    } else {
      detail = otherDetail.trim();
      if (!detail) {
        setNotice("기타 성장 내용을 입력해 주세요.");
        return;
      }
    }

    const advancement: Advancement = {
      id: makeId(),
      tier: character.tier,
      choice,
      detail,
      target,
      skillId: selectedSkillId,
      xpCost: 4,
      completedAt: new Date().toISOString(),
    };
    updateCharacter(character.id, (current) => ({
      ...current,
      xp: current.xp - 4,
      effort,
      stats: updatedStats,
      skills: choice === "skill" && selectedSkillId
        ? current.skills.map((skill) => skill.id === selectedSkillId
            ? { ...skill, level: skill.level === "trained" ? "specialized" : "trained" }
            : skill)
        : current.skills,
      advancements: [...current.advancements, advancement],
    }));
    setOtherDetail("");
    setNotice(`${ADVANCEMENT_CHOICES.find((entry) => entry.id === choice)?.label} 완료 · 4 XP 사용`);
  }

  function advanceTier() {
    if (remainingSlots !== 0 || character.tier >= 6) return;
    updateCharacter(character.id, (current) => ({ ...current, tier: Math.min(6, current.tier + 1) }));
    setNotice(`성장 선택을 완료해 ${character.tier + 1}등급이 되었습니다.`);
  }

  return (
    <ContentCard title="등급 성장" english="ADVANCEMENT · 4 XP EACH" count={tierAdvancements.length} icon="spark">
      <p className="helper-text">각 선택은 4 XP를 사용합니다. 현재 등급에서 성장 선택 4개를 완료하면 다음 등급으로 올라갈 수 있습니다.</p>
      <div className="advancement-progress">
        <div><strong>{character.tier}등급</strong><span>{tierAdvancements.length} / 4 완료</span></div>
        <div className="advancement-progress-bar"><span style={{ width: `${tierAdvancements.length * 25}%` }} /></div>
      </div>
      {tierAdvancements.length > 0 && (
        <div className="advancement-history">
          {tierAdvancements.map((entry) => (
            <div className="advancement-history-row" key={entry.id}>
              <span className="check-mark done"><Icon name="check" size={11} /></span>
              <span>{ADVANCEMENT_CHOICES.find((option) => option.id === entry.choice)?.label}</span>
              <strong>{entry.detail}</strong>
            </div>
          ))}
        </div>
      )}
      {remainingSlots > 0 ? (
        <form className="advancement-form" onSubmit={addAdvancement}>
          <label className="field-label" htmlFor="advancement-choice">성장 선택 <span>· 4 XP</span></label>
          <select id="advancement-choice" className="text-input" value={choice} onChange={(event) => setChoice(event.target.value as AdvancementChoice)}>
            {ADVANCEMENT_CHOICES.filter((entry) => entry.id === "other" || !completedChoices.has(entry.id)).map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.label} — {entry.detail}</option>
            ))}
          </select>
          {choice === "pool" && (
            <div className="pool-allocation">
              <p>세 역량에 합계 4점을 배분합니다. 최대 역량만 증가합니다.</p>
              {STAT_KEYS.map((key) => (
                <label key={key}><span>{STAT_LABELS[key].ko}</span><input type="number" min="0" max="4" value={poolPoints[key]} onChange={(event) => setPoolPoints((current) => ({ ...current, [key]: event.target.value }))} /></label>
              ))}
              <strong>배분 합계: {STAT_KEYS.reduce((sum, key) => sum + (Number(poolPoints[key]) || 0), 0)} / 4</strong>
            </div>
          )}
          {choice === "edge" && (
            <label className="field-label">재능을 올릴 특성치
              <select className="text-input" value={edgeTarget} onChange={(event) => setEdgeTarget(event.target.value as StatKey)}>
                {STAT_KEYS.map((key) => <option key={key} value={key}>{STAT_LABELS[key].ko}</option>)}
              </select>
            </label>
          )}
          {choice === "skill" && (
            <label className="field-label">훈련할 기능
              <select className="text-input" value={skillId} onChange={(event) => setSkillId(event.target.value)}>
                <option value="">기능 선택</option>
                {skillOptions.map((skill) => <option key={skill.id} value={skill.id}>{skill.name} · {SKILL_LEVEL_LABELS[skill.level]} → {skill.level === "trained" ? "능숙함" : "익숙함"}</option>)}
              </select>
            </label>
          )}
          {choice === "other" && <input className="text-input" value={otherDetail} onChange={(event) => setOtherDetail(event.target.value)} placeholder="기타 성장 내용" maxLength={200} />}
          <button className="button button-outline advancement-submit" type="submit" disabled={character.xp < 4}>성장 선택 기록 · 4 XP 사용</button>
        </form>
      ) : (
        <button className="button button-primary advancement-submit" type="button" onClick={advanceTier} disabled={character.tier >= 6}>4개 성장 완료 · {character.tier >= 6 ? "최고 등급" : "다음 등급으로"}</button>
      )}
      <p className="advancement-footnote">경험치 지출과 선택 내역은 기록됩니다. 능력치 풀은 최대치만 증가하며, 기존 현재치는 그대로 유지합니다.</p>
    </ContentCard>
  );
}

function ContentCard({
  title,
  english,
  count,
  icon,
  children,
}: {
  title: string;
  english: string;
  count: number;
  icon: "spark" | "box" | "shield";
  children: ReactNode;
}) {
  return (
    <section className="content-card">
      <div className="content-card-header">
        <div className="content-heading-icon"><Icon name={icon} size={17} /></div>
        <div className="content-heading-title"><h3>{title}</h3><span>{english}</span></div>
        <span className="content-count">{count}</span>
      </div>
      {children}
    </section>
  );
}

function EmptyInline({ children }: { children: React.ReactNode }) {
  return <div className="empty-inline"><span>✧</span>{children}</div>;
}

function EntryList({
  entries,
  empty,
  onRemove,
  onDescription,
}: {
  entries: CharacterEntry[];
  empty: string;
  onRemove: (id: string) => void;
  onDescription: (id: string, value: string) => void;
}) {
  if (entries.length === 0) return <EmptyInline>{empty}</EmptyInline>;
  return (
    <div className="entry-list">
      {entries.map((entry) => (
        <div className="entry-row" key={entry.id}>
          <div className="entry-icon"><span>✧</span></div>
          <div className="entry-main">
            <strong>{entry.name}</strong>
            <input aria-label={`${entry.name} 설명`} value={entry.description} placeholder="설명 · 출처 · 메모" maxLength={300} onChange={(event) => onDescription(entry.id, event.target.value)} />
          </div>
          <button className="entry-remove" type="button" onClick={() => onRemove(entry.id)} aria-label={`${entry.name} 삭제`}><Icon name="close" size={15} /></button>
        </div>
      ))}
    </div>
  );
}

function RulesView() {
  const glossaryGroups = [
    {
      title: "캐릭터 구성",
      terms: [
        ["Descriptor", "수식어"],
        ["Type", "유형"],
        ["Focus", "특징"],
        ["Glaive · Nano · Jack", "글레이브 · 나노 · 잭"],
        ["Esoteries · Combat Tricks · Tricks", "에소테리 · 전투술 · 재간"],
      ],
    },
    {
      title: "특성치와 판정",
      terms: [
        ["Stats / Stat Pools", "특성치 / 역량"],
        ["Might · Speed · Intellect", "힘(마이트) · 속력 · 지성"],
        ["Edge · Effort", "재능(비용 감소) · 분발(역량 소비로 난이도 하락)"],
        ["Damage Track", "부상 트랙: 정상 · 부상 · 기력 소진 / 빈사"],
        ["Difficulty · Target Number", "난이도(0–10단계) · 목표치(난이도 × 3)"],
        ["Level · Tier", "레벨(적/대상의 강함) · 등급(캐릭터 성장 단계, 1–6)"],
        ["Trained · Specialized · Inability", "익숙함(난이도 −1) · 능숙함(−2) · 무능(+1)"],
        ["Asset / Assistance", "보탬"],
        ["Minor / Major Effect · GM Intrusion", "작은 이득(주사위 19 등) · 큰 이득(20 등) · 마스터 개입"],
      ],
    },
    {
      title: "물품과 초고대 세계",
      terms: [
        ["Cyphers", "사이퍼: 급용 사이퍼(Immediate) · 절차 사이퍼(Procedural, 2개로 취급)"],
        ["Artifacts · Oddities · Shins", "아티팩트 · 신기품 · 쉰"],
        ["Ninth World · Banterra · The Beyond", "제9세계 · 본터전(남부 정착지) · 저너머땅(동부 변경)"],
        ["Order of Truth · Amber Pope · Clave", "진실회 · 호박석 교황 · 클라베"],
        ["Data Sphere · Iron Wind", "데이터스피어(고대 정보망) · 쇠바람(위험한 나노머신 폭풍)"],
      ],
    },
  ];

  return (
    <section className="rules-page">
      <div className="section-kicker">RULE ARCHIVE</div>
      <div className="rules-title-row"><div><h1>규칙 데이터</h1><p>룰북에서 확인한 선택과 효과를 직접 기록해 관리합니다.</p></div><span className="rules-symbol">◈</span></div>
      <div className="rules-warning"><Icon name="shield" size={20} /><div><strong>검증된 공식 콘텐츠 데이터는 포함되어 있지 않습니다.</strong><p>Numenera 고유 규칙과 콘텐츠는 보유한 룰북에서 확인해 입력해 주세요. 효과나 선택지를 추측해 제공하지 않습니다.</p></div></div>
      <div className="rules-grid">
        <div className="rule-info-card"><span className="rule-info-number">01</span><span className="section-kicker">RULESET</span><h3>룰북 기준 설정</h3><p>캐릭터 생성 시 Discovery 또는 Discovery + Destiny를 기록할 수 있습니다. 콘텐츠 범위의 차이는 사용자가 직접 확인해 주세요.</p><span className="rule-card-status"><span className="status-dot" />캐릭터별 선택 가능</span></div>
        <div className="rule-info-card"><span className="rule-info-number">02</span><span className="section-kicker">CUSTOM CONTENT</span><h3>사용자 정의 선택지</h3><p>유형, 수식어, 특징, 기능, 능력, 장비와 효과를 캐릭터 시트에서 직접 입력할 수 있습니다.</p><span className="rule-card-status"><span className="status-dot" />시트에서 입력 가능</span></div>
        <div className="rule-info-card"><span className="rule-info-number">03</span><span className="section-kicker">SOURCE NOTES</span><h3>출처를 함께 기록</h3><p>입력한 설명에 룰북 이름과 페이지를 함께 적어 두면, 나중에 규칙을 확인하고 수정하기 좋습니다.</p><span className="rule-card-status"><span className="status-dot" />개인 로컬 데이터</span></div>
      </div>
      <section className="glossary-section">
        <div className="section-kicker">KOREAN EDITION TERMS</div>
        <h2>한국어판 용어 기준</h2>
        <p>앱에서 사용하는 주요 용어를 아래와 같이 맞췄습니다. 여기 표시된 일부 규칙은 아직 자동 계산되지 않습니다.</p>
        <div className="glossary-grid">
          {glossaryGroups.map((group) => (
            <article className="glossary-card" key={group.title}>
              <h3>{group.title}</h3>
              {group.terms.map(([english, korean]) => (
                <div className="glossary-row" key={english}>
                  <span>{english}</span><strong>{korean}</strong>
                </div>
              ))}
            </article>
          ))}
        </div>
        <p className="glossary-footnote">난이도 보정, 보탬 중복 제한, 절차 사이퍼의 한도 환산 등은 현재 자동화하지 않습니다. 보유한 룰북을 기준으로 적용해 주세요.</p>
      </section>
      <div className="license-note"><span className="license-mark">§</span><div><strong>콘텐츠와 라이선스 안내</strong><p>이 도구는 Monte Cook Games의 공식 제품이 아닙니다. 상표 및 저작권은 각 권리자에게 있습니다. 공식 설명문, 이미지, 시트 디자인은 포함하지 않습니다. 규칙 데이터의 재배포 전에는 관련 라이선스와 권리를 확인해 주세요.</p></div></div>
    </section>
  );
}

function GoogleSheetsSettings({
  characters,
  setCharacters,
  setNotice,
}: {
  characters: Character[];
  setCharacters: Dispatch<SetStateAction<Character[]>>;
  setNotice: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function saveToGoogleSheets() {
    if (!window.confirm(
      `현재 브라우저의 캐릭터 ${characters.length}개를 시트에 추가하거나 갱신합니다. 이름이 같은 캐릭터는 덮어씁니다. 계속할까요?`,
    )) return;
    setBusy(true);
    try {
      await saveCharactersToGoogleSheet(characters);
      setNotice(`캐릭터 ${characters.length}개를 Google Sheets에 추가하거나 갱신했습니다.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "서버 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function loadFromGoogleSheets() {
    setBusy(true);
    try {
      const imported = await loadCharactersFromGoogleSheet();
      if (imported.length === 0) {
        setNotice("서버에 불러올 캐릭터가 없습니다.");
        return;
      }
      setCharacters((current) => mergeGoogleCharacters(current, imported));
      setNotice(`서버의 캐릭터 ${imported.length}개를 로컬과 병합했습니다. 이름이 같은 경우 더 최근 수정본을 사용합니다.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "서버에서 불러오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-card google-sheets-card">
      <div className="settings-card-head">
        <div className="settings-icon"><Icon name="save" size={18} /></div>
        <div><h2>Google Sheets 서버 저장</h2><p>Apps Script 서버에 캐릭터를 저장하고 다른 기기에서 불러옵니다.</p></div>
      </div>
      <div className="settings-actions google-sheets-actions">
        <button className="button button-outline" type="button" onClick={saveToGoogleSheets} disabled={busy}>
          <Icon name="upload" size={16} /> {busy ? "처리 중…" : "서버에 저장"}
        </button>
        <button className="button button-outline" type="button" onClick={loadFromGoogleSheets} disabled={busy}>
          <Icon name="download" size={16} /> 서버에서 불러오기
        </button>
      </div>
      <div className="settings-caution">
        <Icon name="shield" size={16} />
        <span>이름이 같은 캐릭터만 갱신하고, 다른 캐릭터는 시트에 추가합니다. 시트에는 전체 JSON 백업과 함께 능력치·기능·장비·배경 등 항목별 열도 기록됩니다. JSON 가져오기 후에도 자동으로 시트에 저장됩니다.</span>
      </div>
    </div>
  );
}

function SettingsView({
  theme,
  setTheme,
  importInput,
  exportAll,
  characterCount,
  characters,
  setCharacters,
  setNotice,
}: {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  importInput: React.RefObject<HTMLInputElement | null>;
  exportAll: () => void;
  characterCount: number;
  characters: Character[];
  setCharacters: Dispatch<SetStateAction<Character[]>>;
  setNotice: (message: string) => void;
}) {
  return (
    <section className="settings-page">
      <div className="section-kicker">PREFERENCES</div>
      <h1>설정</h1>
      <p className="settings-subtitle">기본은 이 브라우저에 자동 저장되며, Apps Script를 설정하면 Google Sheets 서버에도 저장할 수 있습니다.</p>
      <div className="settings-card">
        <div className="settings-card-head"><div className="settings-icon"><Icon name="sun" size={18} /></div><div><h2>화면 테마</h2><p>편안한 화면 테마를 선택하세요.</p></div></div>
        <div className="segmented-control">
          <button className={theme === "light" ? "selected" : ""} type="button" onClick={() => setTheme("light")}><Icon name="sun" size={15} /> 라이트</button>
          <button className={theme === "dark" ? "selected" : ""} type="button" onClick={() => setTheme("dark")}><Icon name="moon" size={15} /> 다크</button>
        </div>
      </div>
      <div className="settings-card">
        <div className="settings-card-head"><div className="settings-icon"><Icon name="save" size={18} /></div><div><h2>데이터 백업과 복원</h2><p>캐릭터 {characterCount}개가 브라우저의 로컬 저장소에 자동 저장됩니다.</p></div></div>
        <div className="settings-actions">
          <button className="button button-outline" type="button" onClick={exportAll}><Icon name="download" size={16} /> 전체 JSON 백업</button>
          <button className="button button-outline" type="button" onClick={() => importInput.current?.click()}><Icon name="upload" size={16} /> JSON 가져오기</button>
        </div>
        <div className="settings-caution"><Icon name="shield" size={16} /><span>브라우저 데이터를 지우기 전에 JSON 백업을 내려받아 주세요. 가져오기는 기존 데이터에 추가됩니다.</span></div>
      </div>
      <GoogleSheetsSettings
        characters={characters}
        setCharacters={setCharacters}
        setNotice={setNotice}
      />
      <div className="settings-card settings-about">
        <span className="section-kicker">ABOUT THIS TOOL</span>
        <h2>제9세계 캐릭터 아틀라스</h2>
        <p>개인 플레이 기록과 캐릭터 관리를 돕는 비공식 팬 제작 도구입니다. 브라우저 자동 저장과 별도로, Apps Script 설정 후 Google Sheets에 서버 저장·복원할 수 있습니다.</p>
        <div className="about-row"><span>버전</span><strong>0.1.0 · MVP</strong></div>
        <div className="about-row"><span>저장 방식</span><strong>LocalStorage · Google Sheets (Apps Script)</strong></div>
        <div className="about-row"><span>캐릭터</span><strong>{characterCount}개</strong></div>
      </div>
    </section>
  );
}
