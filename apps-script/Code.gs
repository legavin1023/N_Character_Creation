const SHEET_NAME = "캐릭터";
const HEADERS = ["id", "updatedAt", "이름", "캐릭터 JSON"];
const MAX_CELL_LENGTH = 45000;

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
  SpreadsheetApp.openById(spreadsheetId).getSheets();
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
    delete storedCharacter.portrait;
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
