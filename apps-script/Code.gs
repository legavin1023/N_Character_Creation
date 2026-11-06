const SHEET_NAME = "캐릭터";
const HEADERS = ["id", "updatedAt", "이름", "캐릭터 JSON"];
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
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
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
    return [character.id, character.updatedAt, character.name, rawCharacter];
  });

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

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
