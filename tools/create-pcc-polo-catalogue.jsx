#target "InDesign"

(function () {
    var root = new Folder("C:/Users/Tumelo/Documents/PCC Tournament Polo Catalogue");
    var inddFolder = new Folder(root.fsName + "/06 InDesign");
    var exportFolder = new Folder(root.fsName + "/07 Exports");
    var referenceFolder = new Folder(root.fsName + "/01 References");

    if (!inddFolder.exists) inddFolder.create();
    if (!exportFolder.exists) exportFolder.create();

    var inddFile = new File(inddFolder.fsName + "/PCC Tournament Polo Catalogue - Master V2.indd");
    var idmlFile = new File(inddFolder.fsName + "/PCC Tournament Polo Catalogue - Master V2.idml");
    var pdfFile = new File(exportFolder.fsName + "/PCC Master Polo V2 - Review.pdf");

    var oldInteraction = app.scriptPreferences.userInteractionLevel;
    app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;

    function colour(doc, name, values) {
        var swatch;
        try {
            swatch = doc.colors.itemByName(name);
            swatch.name;
        } catch (_) {
            swatch = doc.colors.add({
                name: name,
                model: ColorModel.PROCESS,
                space: ColorSpace.CMYK,
                colorValue: values
            });
        }
        return swatch;
    }

    function addText(page, layer, bounds, text, size, colourValue, fontStyle) {
        var frame = page.textFrames.add(layer, undefined, undefined, {
            geometricBounds: bounds,
            contents: text
        });
        frame.textFramePreferences.insetSpacing = [0, 0, 0, 0];
        frame.paragraphs[0].pointSize = size;
        frame.paragraphs[0].fillColor = colourValue;
        frame.paragraphs[0].justification = Justification.LEFT_ALIGN;
        return frame;
    }

    function polygon(page, layer, points, fill, stroke, weight) {
        var shape = page.polygons.add(layer);
        shape.paths[0].entirePath = points;
        shape.fillColor = fill;
        shape.strokeColor = stroke;
        shape.strokeWeight = weight || 0;
        return shape;
    }

    function addReferencePage(doc, fileName, title, layer, paper, ink) {
        var page = doc.pages.add();
        var bg = page.rectangles.add(layer, undefined, undefined, {
            geometricBounds: [0, 0, 297, 420],
            fillColor: paper,
            strokeWeight: 0
        });
        bg.sendToBack();
        addText(page, layer, [12, 14, 24, 300], title, 15, ink, "Bold");

        var imageFile = new File(referenceFolder.fsName + "/" + fileName);
        var frame = page.rectangles.add(layer, undefined, undefined, {
            geometricBounds: [30, 14, 282, 406],
            fillColor: paper,
            strokeColor: ink,
            strokeWeight: 0.4
        });
        frame.place(imageFile);
        frame.fit(FitOptions.PROPORTIONALLY);
        frame.fit(FitOptions.CENTER_CONTENT);
        return page;
    }

    var doc = null;
    try {
        doc = app.documents.add();
        doc.documentPreferences.properties = {
            pageWidth: "420mm",
            pageHeight: "297mm",
            facingPages: false,
            pagesPerDocument: 1
        };
        doc.viewPreferences.horizontalMeasurementUnits = MeasurementUnits.MILLIMETERS;
        doc.viewPreferences.verticalMeasurementUnits = MeasurementUnits.MILLIMETERS;

        var baseLayer = doc.layers[0];
        baseLayer.name = "01 Base Body";
        var sleevesLayer = doc.layers.add({ name: "02 Sleeves" });
        var collarLayer = doc.layers.add({ name: "03 Collar" });
        var placketLayer = doc.layers.add({ name: "04 Placket" });
        var seamsLayer = doc.layers.add({ name: "05 Seams" });
        var panelsLayer = doc.layers.add({ name: "06 Side Panels - LOCKED" });
        var checkerLayer = doc.layers.add({ name: "07 Checkerboard - LOCKED" });
        var logosLayer = doc.layers.add({ name: "08 Logos - LOCKED" });
        var textLayer = doc.layers.add({ name: "09 Text - LOCKED" });
        var referenceLayer = doc.layers.add({ name: "10 References" });
        panelsLayer.locked = true;
        checkerLayer.locked = true;
        logosLayer.locked = true;
        textLayer.locked = true;

        var black = colour(doc, "PCC Black", [75, 68, 67, 90]);
        var blackMid = colour(doc, "PCC Black Mid", [70, 64, 63, 75]);
        var seam = colour(doc, "Construction Seam", [58, 51, 50, 58]);
        var red = colour(doc, "PCC Red", [10, 100, 92, 2]);
        var paper = colour(doc, "Studio Paper", [4, 4, 6, 0]);
        var ink = colour(doc, "Studio Ink", [72, 66, 65, 76]);

        var page = doc.pages[0];
        page.rectangles.add(baseLayer, undefined, undefined, {
            geometricBounds: [0, 0, 297, 420],
            fillColor: paper,
            strokeWeight: 0
        }).sendToBack();

        addText(page, baseLayer, [14, 18, 24, 180], "PCC APPAREL STUDIO  /  MASTER 01", 8, red, "Bold");
        addText(page, baseLayer, [28, 18, 48, 240], "BLANK FRONT POLO", 25, ink, "Bold");
        addText(page, baseLayer, [49, 18, 61, 250], "STEP 1  -  SILHOUETTE AND CONSTRUCTION ONLY", 7, ink);

        // Garment coordinates are in millimetres on an A3 landscape page.
        polygon(page, sleevesLayer,
            [[130, 88], [116, 89], [98, 95], [80, 106], [68, 123], [71, 148],
             [77, 163], [112, 154], [116, 139], [123, 121], [136, 104]],
            blackMid, black, 0.5);
        polygon(page, sleevesLayer,
            [[290, 88], [304, 89], [322, 95], [340, 106], [352, 123], [349, 148],
             [343, 163], [308, 154], [304, 139], [297, 121], [284, 104]],
            blackMid, black, 0.5);

        polygon(page, baseLayer,
            [[132, 86], [154, 79], [181, 76], [210, 78], [239, 76], [266, 79],
             [288, 86], [303, 105], [305, 128], [300, 161], [294, 205],
             [299, 263], [121, 263], [126, 205], [120, 161], [115, 128],
             [117, 105]],
            black, black, 0.6);

        // Rib cuffs.
        polygon(page, sleevesLayer,
            [[71, 148], [113, 138], [111, 154], [77, 163]],
            black, seam, 0.6);
        polygon(page, sleevesLayer,
            [[349, 148], [307, 138], [309, 154], [343, 163]],
            black, seam, 0.6);

        // Neck opening, collar leaves and placket.
        page.ovals.add(collarLayer, undefined, undefined, {
            geometricBounds: [77, 179, 108, 241],
            fillColor: black,
            strokeWeight: 0
        });
        polygon(page, collarLayer,
            [[166, 81], [207, 91], [194, 119], [161, 102]],
            blackMid, black, 0.5);
        polygon(page, collarLayer,
            [[254, 81], [213, 91], [226, 119], [259, 102]],
            blackMid, black, 0.5);

        var placket = page.rectangles.add(placketLayer, undefined, undefined, {
            geometricBounds: [100, 203, 143, 217],
            fillColor: blackMid,
            strokeColor: seam,
            strokeWeight: 0.4
        });
        var button1 = page.ovals.add(placketLayer, undefined, undefined, {
            geometricBounds: [111, 208.5, 114, 211.5],
            fillColor: black,
            strokeColor: seam,
            strokeWeight: 0.35
        });
        var button2 = page.ovals.add(placketLayer, undefined, undefined, {
            geometricBounds: [126, 208.5, 129, 211.5],
            fillColor: black,
            strokeColor: seam,
            strokeWeight: 0.35
        });

        // Construction seams, intentionally subtle.
        var leftShoulder = page.graphicLines.add(seamsLayer, undefined, undefined, {
            geometricBounds: [94, 119, 103, 165],
            strokeColor: seam,
            strokeWeight: 0.35
        });
        var rightShoulder = page.graphicLines.add(seamsLayer, undefined, undefined, {
            geometricBounds: [94, 255, 103, 301],
            strokeColor: seam,
            strokeWeight: 0.35
        });
        var hem = page.graphicLines.add(seamsLayer, undefined, undefined, {
            geometricBounds: [257, 119, 257, 301],
            strokeColor: seam,
            strokeWeight: 0.35
        });

        addText(page, baseLayer, [270, 18, 282, 170], "PCC-MP-001  /  FRONT VIEW  /  SCALE 1:5", 6, ink);
        addText(page, baseLayer, [270, 275, 282, 402], "AWAITING SILHOUETTE APPROVAL", 6, red, "Bold");

        addReferencePage(doc, "Home-Away-Collection.png",
            "REFERENCE A  /  HOME & AWAY COLLECTION", referenceLayer, paper, ink);
        addReferencePage(doc, "Official-Tournament-Collection.png",
            "REFERENCE B  /  OFFICIAL TOURNAMENT COLLECTION", referenceLayer, paper, ink);
        referenceLayer.locked = true;

        doc.save(inddFile);
        doc.exportFile(ExportFormat.INDESIGN_MARKUP, idmlFile, false);

        var preset;
        try {
            preset = app.pdfExportPresets.itemByName("[High Quality Print]");
            preset.name;
        } catch (_) {
            preset = app.pdfExportPresets[0];
        }
        doc.exportFile(ExportFormat.PDF_TYPE, pdfFile, false, preset);
        doc.save();

        app.activeWindow.activePage = doc.pages[0];
        app.activeWindow.zoom(ZoomOptions.FIT_PAGE);
    } catch (error) {
        var logFile = new File(root.fsName + "/indesign-setup-error.txt");
        logFile.open("w");
        logFile.write("Message: " + error.message + "\r\nLine: " + error.line);
        logFile.close();
        try {
            if (doc && doc.isValid && !doc.saved) doc.close(SaveOptions.NO);
        } catch (_) {}
        throw error;
    } finally {
        app.scriptPreferences.userInteractionLevel = oldInteraction;
    }
}());
