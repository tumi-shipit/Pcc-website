#target "InDesign"

(function () {
    var doc = app.activeDocument;
    var page = doc.pages[0];
    var root = new Folder("C:/Users/Tumelo/Documents/PCC Tournament Polo Catalogue");
    var inddFile = new File(root.fsName + "/06 InDesign/PCC Tournament Polo Catalogue - Black Front V4.indd");
    var idmlFile = new File(root.fsName + "/06 InDesign/PCC Tournament Polo Catalogue - Black Front V4.idml");
    var pdfFile = new File(root.fsName + "/07 Exports/PCC Black Front V4 - Review.pdf");
    var logoFile = new File(root.fsName + "/02 Logos/PCC-Logo-White.png");

    function layer(name) {
        var value = doc.layers.itemByName(name);
        value.locked = false;
        value.visible = true;
        return value;
    }

    function colour(name) {
        return doc.colors.itemByName(name);
    }

    function clearLayer(target) {
        for (var i = page.pageItems.length - 1; i >= 0; i--) {
            if (page.pageItems[i].itemLayer === target) {
                page.pageItems[i].remove();
            }
        }
    }

    function polygon(target, points, fill, stroke, weight) {
        var shape = page.polygons.add(target);
        shape.paths[0].entirePath = points;
        shape.fillColor = fill;
        shape.strokeColor = stroke;
        shape.strokeWeight = weight || 0;
        return shape;
    }

    var panels = layer("06 Side Panels");
    var logos = layer("08 Logos & Flag");
    clearLayer(panels);
    clearLayer(logos);

    var red = colour("PCC Red");
    var white = colour("PCC White");
    var green = colour("SA Green");
    var blue = colour("SA Blue");
    var yellow = colour("SA Gold");
    var flagBlack = colour("SA Black");

    // Preserve V3, then correct the artwork on a new version.
    doc.save(inddFile);

    // Points are x,y. Panels now track the outside torso seams.
    polygon(panels,
        [[121, 137], [122, 150], [126, 160], [129, 205], [123, 256],
         [136, 256], [141, 206], [138, 160], [133, 145]],
        red, red, 0);
    polygon(panels,
        [[299, 137], [298, 150], [294, 160], [291, 205], [297, 256],
         [284, 256], [279, 206], [282, 160], [287, 145]],
        red, red, 0);

    polygon(panels,
        [[135, 143], [140, 160], [143, 206], [138, 256],
         [140, 256], [145, 206], [142, 159], [137, 141]],
        white, white, 0);
    polygon(panels,
        [[285, 143], [280, 160], [277, 206], [282, 256],
         [280, 256], [275, 206], [278, 159], [283, 141]],
        white, white, 0);

    // South African flag, rebuilt as one compact sleeve badge.
    var fy = 116, fx = 83, fh = 13, fw = 22;
    page.rectangles.add(logos, undefined, undefined, {
        geometricBounds: [fy, fx, fy + fh / 2, fx + fw],
        fillColor: red, strokeColor: white, strokeWeight: 0.25
    });
    page.rectangles.add(logos, undefined, undefined, {
        geometricBounds: [fy + fh / 2, fx, fy + fh, fx + fw],
        fillColor: blue, strokeColor: white, strokeWeight: 0.25
    });
    polygon(logos,
        [[fx, fy], [fx + 8, fy + fh / 2], [fx, fy + fh], [fx + 5, fy + fh],
         [fx + 12, fy + fh / 2], [fx + 5, fy]],
        green, white, 0.45);
    polygon(logos,
        [[fx, fy + 2], [fx + 6, fy + fh / 2], [fx, fy + fh - 2]],
        flagBlack, yellow, 0.65);

    // Transparent white/red logo sized to the reference chest placement.
    var logoFrame = page.rectangles.add(logos, undefined, undefined, {
        geometricBounds: [112, 241, 143, 276],
        fillColor: "None",
        strokeWeight: 0
    });
    logoFrame.place(logoFile);
    logoFrame.fit(FitOptions.PROPORTIONALLY);
    logoFrame.fit(FitOptions.CENTER_CONTENT);

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
