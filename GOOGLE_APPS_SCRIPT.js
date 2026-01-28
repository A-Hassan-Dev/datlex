

var FOLDER_NAME = "WareFlow Reports";
var DB_FILE_NAME = "WareFlow Database";
var SHEET_TAB_NAME = "Main Issue Backup";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === "locate_data") {
      var folder = getOrCreateFolder(FOLDER_NAME);
      var ss = getOrCreateSpreadsheet(folder);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        folderUrl: folder.getUrl(),
        sheetUrl: ss.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "upload_file") {
      var folder = getOrCreateFolder(FOLDER_NAME);

      var decoded = Utilities.base64Decode(data.fileData);
      var blob = Utilities.newBlob(decoded, data.mimeType, data.fileName);
      var file = folder.createFile(blob);

      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        url: file.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = getOrCreateSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_TAB_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_TAB_NAME);
      sheet.appendRow([
        "ID", "Date", "Location", "Sector", "Division", "Machine",
        "Maint. Plan", "Item ID", "Item Name", "Quantity", "Status",
        "Notes", "Warehouse Email", "Site Email"
      ]);
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      data.id,
      data.timestamp,
      data.locationId,
      data.sectorName || "",
      data.divisionName || "",
      data.machineName,
      data.maintenancePlan || "",
      data.itemId,
      data.itemName,
      data.quantity,
      data.status,
      data.notes || "",
      data.warehouseEmail || "",
      data.requesterEmail || ""
    ]);

    var emailTo = data.warehouseEmail || data.requesterEmail;
    if (emailTo) {
      var subject = "Material Issue Request: " + data.id + " (" + data.status + ")";
      var body = "A new material issue request has been submitted.\n\n" +
        "Request ID: " + data.id + "\n" +
        "Location: " + (data.locationName || data.locationId) + "\n" +
        "Status: " + data.status + "\n" +
        "Requester: " + (data.requesterName || data.requesterEmail) + "\n\n" +
        "Please review this request in the Daltex Maintenance System.";

      MailApp.sendEmail({
        to: emailTo,
        subject: subject,
        body: body
      });
    }


    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: e.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}


function getOrCreateFolder(name) {
  var folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(name);
  }
}

function getOrCreateSpreadsheet(parentFolder) {
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) { }

  var files = DriveApp.getFilesByName(DB_FILE_NAME);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }

  var newSS = SpreadsheetApp.create(DB_FILE_NAME);

  if (parentFolder) {
    var file = DriveApp.getFileById(newSS.getId());
    file.moveTo(parentFolder);
  }

  return newSS;
}
