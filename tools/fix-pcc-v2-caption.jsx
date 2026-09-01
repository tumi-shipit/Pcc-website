#target "InDesign"

(function () {
    var doc = app.activeDocument;
    var page = doc.pages[0];
    var frames = page.textFrames;
    for (var i = 0; i < frames.length; i++) {
        if (frames[i].contents.indexOf("STEP 1") === 0) {
            frames[i].contents = "STEP 1  -  SILHOUETTE AND CONSTRUCTION ONLY";
        }
    }

    var pdfFile = new File("C:/Users/Tumelo/Documents/PCC Tournament Polo Catalogue/07 Exports/PCC Master Polo V2 - Review.pdf");
    var preset;
    try {
        preset = app.pdfExportPresets.itemByName("[High Quality Print]");
        preset.name;
    } catch (_) {
        preset = app.pdfExportPresets[0];
    }
    doc.save();
    doc.exportFile(ExportFormat.PDF_TYPE, pdfFile, false, preset);
}());
