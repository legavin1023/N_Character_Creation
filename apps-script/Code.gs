const SHEET_NAME = "캐릭터";
// The first four columns are kept in their original order so existing sheets
// remain readable. The following columns make the same character data visible
// and editable-at-a-glance, while the JSON remains the lossless source of truth.
const HEADERS = [
  "id", "updatedAt", "이름", "캐릭터 JSON",
  "플레이어", "생성일", "규칙", "수식어", "유형", "특징", "등급", "XP", "분발", "쉰",
  "힘 현재", "힘 최대", "힘 재능", "속력 현재", "속력 최대", "속력 재능", "지성 현재", "지성 최대", "지성 재능",
  "기능", "특수 능력", "장비", "사이퍼", "사이퍼 한도", "공격", "아티팩트", "신기품",
  "방어구", "회복", "성장", "피해 상태", "초상화 파일 ID",
  "출신", "외형", "성격", "이력", "동기", "목표", "비밀", "관계", "메모"
];
const MAX_CELL_LENGTH = 45000;
const PORTRAIT_FOLDER_NAME = "누메네라 캐릭터 초상화";

function doPost(event) {
  try {
    const request = JSON.parse(event.postData.contents);
    const properties = PropertiesService.getScriptProperties();
    const expectedSecret = properties.getProperty("SHARED_SECRET");
    const spreadsheetId = properties.getProperty("SPREADSHEET_ID");

    if (!expectedSecret || !spreadsheetId || !constantTimeEquals(request.secret, expectedSecret)) {
      return jsonOutput({ ok: false, error: "인증 정보가 올바르지 않습니다." });
    }

    const sheet = getCharacterSheet(spreadsheetId);
    if (request.action === "load") {
      return jsonOutput({ ok: true, characters: readCharacters(sheet) });
    }
    if (request.action === "save") {
      if (!Array.isArray(request.characters)) {
        return jsonOutput({ ok: false, error: "저장할 캐릭터 목록 형식이 올바르지 않습니다." });
      }
      upsertCharacters(sheet, request.characters);
      return jsonOutput({ ok: true, count: request.characters.length });
    }
    return jsonOutput({ ok: false, error: "지원하지 않는 요청입니다." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Apps Script 처리 중 오류가 발생했습니다.";
    return jsonOutput({ ok: false, error: message });
  }
}

function authorizeSpreadsheetAccess() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!spreadsheetId) {
    throw new Error("스크립트 속성에 SPREADSHEET_ID를 먼저 등록해 주세요.");
  }
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  spreadsheet.getSheets();
  getPortraitFolder(spreadsheet);
}

function getCharacterSheet(spreadsheetId) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  ensureHeaders(sheet);
  return sheet;
}

function ensureHeaders(sheet) {
  const existing = sheet.getLastRow() > 0
    ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 4)).getDisplayValues()[0]
    : [];
  const currentHeaders = HEADERS.map((header, index) => existing[index] || header);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([currentHeaders]);
}

function readCharacters(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, 4).getDisplayValues();
  return rows.flatMap((row, index) => {
    const [id, , , rawCharacter] = row;
    if (!id && !rawCharacter) return [];
    if (!id || !rawCharacter) {
      throw new Error(`시트 ${index + 2}행의 캐릭터 데이터가 손상되었습니다.`);
    }

    const character = JSON.parse(rawCharacter);
    if (character.id !== id || typeof character.name !== "string") {
      throw new Error(`시트 ${index + 2}행의 캐릭터 정보가 올바르지 않습니다.`);
    }
    if (typeof character.portraitFileId === "string") {
      character.portrait = readPortrait(character.portraitFileId);
    }
    return [character];
  });
}

function upsertCharacters(sheet, characters) {
  const rows = characters.map((character) => {
    if (
      !character ||
      typeof character.id !== "string" ||
      typeof character.name !== "string" ||
      !character.name.trim() ||
      typeof character.updatedAt !== "string"
    ) {
      throw new Error("캐릭터 데이터 형식이 올바르지 않습니다.");
    }

    const storedCharacter = Object.assign({}, character);
    storePortrait(storedCharacter);
    const rawCharacter = JSON.stringify(storedCharacter);
    if (rawCharacter.length > MAX_CELL_LENGTH) {
      throw new Error(`“${character.name}”의 데이터가 Google Sheets 셀 크기를 초과합니다.`);
    }
    return characterToRow(character, storedCharacter, rawCharacter);
  });

  ensureHeaders(sheet);

  const lastRow = sheet.getLastRow();
  const storedRows = lastRow < 2
    ? []
    : sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getDisplayValues();
  const rowByName = new Map();
  storedRows.forEach((row, index) => {
    const name = row[2].trim();
    if (name && !rowByName.has(name)) rowByName.set(name, index + 2);
  });

  const updates = new Map();
  const additions = new Map();
  rows.forEach((row) => {
    const name = row[2].trim();
    const existingRow = rowByName.get(name);
    if (existingRow) {
      updates.set(existingRow, row);
    } else if (additions.has(name)) {
      additions.set(name, row);
    } else {
      additions.set(name, row);
    }
  });

  updates.forEach((row, rowNumber) => {
    const range = sheet.getRange(rowNumber, 1, 1, HEADERS.length);
    range.setNumberFormat("@");
    range.setValues([row]);
  });

  if (additions.size > 0) {
    const additionRows = Array.from(additions.values());
    const range = sheet.getRange(lastRow + 1, 1, additionRows.length, HEADERS.length);
    range.setNumberFormat("@");
    range.setValues(additionRows);
  }
}

function characterToRow(character, storedCharacter, rawCharacter) {
  const stat = (key, field) => Number(character.stats && character.stats[key] && character.stats[key][field]) || 0;
  const background = character.background || {};
  const list = (items) => Array.isArray(items) ? items.map(item => JSON.stringify(item)).join("\n") : "";
  const skills = Array.isArray(character.skills)
    ? character.skills.map(skill => `${skill.name || ""} · ${skill.level || ""}${skill.note ? ` · ${skill.note}` : ""}`).join("\n")
    : "";
  const armor = character.armor || {};
  const recovery = character.recovery || {};
  return [
    character.id, character.updatedAt, character.name, rawCharacter,
    character.playerName || "", character.createdAt || "", character.ruleSet || "", character.descriptor || "", character.type || "", character.focus || "", character.tier || 0, character.xp || 0, character.effort || 0, character.shins || 0,
    stat("might", "current"), stat("might", "max"), stat("might", "edge"), stat("speed", "current"), stat("speed", "max"), stat("speed", "edge"), stat("intellect", "current"), stat("intellect", "max"), stat("intellect", "edge"),
    skills, list(character.abilities), list(character.equipment), list(character.cyphers), character.cypherLimit || 0, list(character.attacks), list(character.artifacts), list(character.oddities),
    JSON.stringify(armor), JSON.stringify(recovery), list(character.advancements), character.damageState || "", storedCharacter.portraitFileId || "",
    background.origin || "", background.appearance || "", background.personality || "", background.history || "", background.motivation || "", background.goal || "", background.secret || "", background.connections || "", character.notes || ""
  ];
}

function storePortrait(character) {
  if (typeof character.portrait !== "string" || !character.portrait.startsWith("data:image/")) {
    delete character.portrait;
    return;
  }
  if (typeof character.portraitFileId === "string" && character.portraitFileId) {
    delete character.portrait;
    return;
  }
  const match = character.portrait.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i);
  if (!match) throw new Error("초상화 이미지 형식이 올바르지 않습니다.");
  const bytes = Utilities.base64Decode(match[2]);
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const name = `${sanitizeFileName(character.name)}-${character.id}.${imageExtension(match[1])}`;
  const file = getPortraitFolder(spreadsheet).createFile(Utilities.newBlob(bytes, match[1], name));
  character.portraitFileId = file.getId();
  delete character.portrait;
}

function readPortrait(fileId) {
  try {
    const blob = DriveApp.getFileById(fileId).getBlob();
    if (!blob.getContentType().startsWith("image/")) return undefined;
    return `data:${blob.getContentType()};base64,${Utilities.base64Encode(blob.getBytes())}`;
  } catch (error) {
    return undefined;
  }
}

function getPortraitFolder(spreadsheet) {
  const properties = PropertiesService.getScriptProperties();
  const savedFolderId = properties.getProperty("PORTRAIT_FOLDER_ID");
  if (savedFolderId) {
    try {
      return DriveApp.getFolderById(savedFolderId);
    } catch (error) {
      properties.deleteProperty("PORTRAIT_FOLDER_ID");
    }
  }
  const spreadsheetFile = DriveApp.getFileById(spreadsheet.getId());
  const parents = spreadsheetFile.getParents();
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const folders = parent.getFoldersByName(PORTRAIT_FOLDER_NAME);
  const folder = folders.hasNext() ? folders.next() : parent.createFolder(PORTRAIT_FOLDER_NAME);
  properties.setProperty("PORTRAIT_FOLDER_ID", folder.getId());
  return folder;
}

function imageExtension(mimeType) {
  const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
  return extensions[mimeType.toLowerCase()] || "img";
}

function sanitizeFileName(value) {
  return String(value || "character").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
}

function constantTimeEquals(actual, expected) {
  if (typeof actual !== "string" || actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

function jsonOutput(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
