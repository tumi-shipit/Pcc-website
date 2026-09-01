#target "InDesign"

(function () {
    var doc = app.activeDocument;
    var page = doc.pages[0];
    var root = new Folder("C:/Users/Tumelo/Documents/PCC Tournament Polo Catalogue");
    var inddFile = new File(root.fsName + "/06 InDesign/PCC Tournament Polo Catalogue - Black Front V3.indd");
    var idmlFile = new File(root.fsName + "/06 InDesign/PCC Tournament Polo Catalogue - Black Front V3.idml");
    var pdfFile = new File(root.fsName + "/07 Exports/PCC Black Front V3 - Review.pdf");
    var logoFile = new File(root.fsName + "/02 Logos/PCC-Logo.png");

    function getLayer(name) {
        var layer = doc.layers.itemByName(name);
        layer.name;
        layer.locked = false;
        layer.visible = true;
        return layer;
    }

    function getColour(name, values) {
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

    function polygon(layer, points, fill, stroke, weight) {
        var shape = page.polygons.add(layer);
        shape.paths[0].entirePath = points;
        shape.fillColor = fill;
        shape.strokeColor = stroke;
        shape.strokeWeight = weight || 0;
        return shape;
    }

    function text(layer, bounds, contents, size, colourValue, alignment) {
        var frame = page.textFrames.add(layer, undefined, undefined, {
            geometricBounds: bounds,
            contents: contents
        });
        frame.textFramePreferences.insetSpacing = [0, 0, 0, 0];
        frame.parentStory.texts[0].pointSize = size;
        frame.parentStory.texts[0].fillColor = colourValue;
        frame.parentStory.paragraphs[0].justification = alignment || Justification.CENTER_ALIGN;
        return frame;
    }

    var panels = getLayer("06 Side Panels - LOCKED");
    var checker = getLayer("07 Checkerboard - LOCKED");
    var logos = getLayer("08 Logos - LOCKED");
    var type = getLayer("09 Text - LOCKED");
    var collar = getLayer("03 Collar");
    var sleeves = getLayer("02 Sleeves");

    panels.name = "06 Side Panels";
    checker.name = "07 Checkerboard Fade";
    logos.name = "08 Logos & Flag";
    type.name = "09 Name & Position";

    var red = getColour("PCC Red", [10, 100, 92, 2]);
    var white = getColour("PCC White", [0, 0, 0, 0]);
    var darkGrey = getColour("Checker Grey", [65, 58, 57, 62]);
    var green = getColour("SA Green", [100, 5, 85, 25]);
    var blue = getColour("SA Blue", [100, 78, 5, 2]);
    var yellow = getColour("SA Gold", [3, 8, 95, 0]);
    var flagBlack = getColour("SA Black", [75, 68, 67, 90]);

    // Preserve the approved blank master before artwork is introduced.
    doc.save(inddFile);

    // Dynamic red side panels, tapered to follow the athletic body.
    polygon(panels,
        [[137, 121], [150, 122], [159, 126], [205, 129], [256, 123],
         [256, 136], [206, 141], [160, 138], [145, 133]],
        red, red, 0);
    polygon(panels,
        [[137, 299], [150, 298], [159, 294], [205, 291], [256, 297],
         [256, 284], [206, 279], [160, 282], [145, 287]],
        red, red, 0);

    // Narrow white piping on the inside edge of each panel.
    polygon(panels,
        [[143, 135], [160, 139], [205, 142], [256, 137],
         [256, 139], [205, 144], [160, 141], [143, 138]],
        white, white, 0);
    polygon(panels,
        [[143, 285], [160, 281], [205, 278], [256, 283],
         [256, 281], [205, 276], [160, 279], [143, 282]],
        white, white, 0);

    // Checkerboard fade: strongest at the hem, fading upward.
    var startX = 123;
    var startY = 219;
    var cellW = 16;
    var cellH = 11;
    var columns = 11;
    var rows = 4;
    for (var row = 0; row < rows; row++) {
        for (var col = 0; col < columns; col++) {
            if ((row + col) % 2 === 0) {
                var square = page.rectangles.add(checker, undefined, undefined, {
                    geometricBounds: [
                        startY + row * cellH,
                        startX + col * cellW,
                        startY + (row + 1) * cellH,
                        startX + (col + 1) * cellW
                    ],
                    fillColor: darkGrey,
                    strokeWeight: 0
                });
                square.transparencySettings.blendingSettings.opacity = 18 + row * 8;
            }
        }
    }

    // Collar piping: outside red, inside white.
    polygon(collar, [[163, 85], [205, 95], [203, 99], [162, 89]], red, red, 0);
    polygon(collar, [[164, 89], [204, 99], [202, 101], [164, 92]], white, white, 0);
    polygon(collar, [[257, 85], [215, 95], [217, 99], [258, 89]], red, red, 0);
    polygon(collar, [[256, 89], [216, 99], [218, 101], [256, 92]], white, white, 0);

    // Sleeve cuff stripes.
    polygon(sleeves, [[72, 151], [112, 141], [112, 145], [73, 155]], red, red, 0);
    polygon(sleeves, [[73, 155], [112, 145], [112, 148], [74, 158]], white, white, 0);
    polygon(sleeves, [[348, 151], [308, 141], [308, 145], [347, 155]], red, red, 0);
    polygon(sleeves, [[347, 155], [308, 145], [308, 148], [346, 158]], white, white, 0);

    // South African flag on the wearer's right sleeve (viewer left).
    var fy = 116, fx = 83, fh = 13, fw = 22;
    page.rectangles.add(logos, undefined, undefined, {
        geometricBounds: [fy, fx, fy + fh / 2, fx + fw],
        fillColor: red, strokeColor: white, strokeWeight: 0.3
    });
    page.rectangles.add(logos, undefined, undefined, {
        geometricBounds: [fy + fh / 2, fx, fy + fh, fx + fw],
        fillColor: blue, strokeColor: white, strokeWeight: 0.3
    });
    polygon(logos,
        [[fy, fx], [fy + fh / 2, fx + 8], [fy + fh, fx], [fy + fh, fx + 5],
         [fy + fh / 2, fx + 12], [fy, fx + 5]],
        green, white, 0.5);
    polygon(logos,
        [[fy + 2, fx], [fy + fh / 2, fx + 6], [fy + fh - 2, fx]],
        flagBlack, yellow, 0.8);

    // Official PCC chest logo.
    var logoFrame = page.rectangles.add(logos, undefined, undefined, {
        geometricBounds: [111, 238, 148, 279],
        fillColor: "None",
        strokeWeight: 0
    });
    logoFrame.place(logoFile);
    logoFrame.fit(FitOptions.PROPORTIONALLY);
    logoFrame.fit(FitOptions.CENTER_CONTENT);

    // Reference-matched player identification.
    text(type, [116, 142, 124, 191], "TUMELO MMOLA", 6.5, white);
    text(type, [125, 142, 133, 191], "CAPTAIN", 6.5, red);

    // Replace review caption.
    var frames = page.textFrames;
    for (var i = 0; i < frames.length; i++) {
        if (frames[i].contents.indexOf("BLANK FRONT POLO") === 0) {
            frames[i].contents = "BLACK FRONT POLO";
        }
        if (frames[i].contents.indexOf("STEP 1") === 0) {
            frames[i].contents = "STEP 1  -  BLACK FRONT ARTWORK";
        }
        if (frames[i].contents.indexOf("AWAITING SILHOUETTE") === 0) {
            frames[i].contents = "AWAITING BLACK FRONT APPROVAL";
        }
    }

    doc.save();
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
    app.activeWindow.activePage = page;
    app.activeWindow.zoom(ZoomOptions.FIT_PAGE);
}());
