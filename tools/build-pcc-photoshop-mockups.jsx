#target photoshop

(function () {
    app.displayDialogs = DialogModes.NO;
    app.preferences.rulerUnits = Units.PIXELS;

    var root = "C:/Users/Tumelo/Documents/PCC Tournament Polo Catalogue";
    var frontBase = new File(root + "/03 Shirt Mockups/blank-front-master.png");
    var backBase = new File(root + "/03 Shirt Mockups/blank-back-master.png");
    var psdDir = root + "/03 Shirt Mockups/PSD Masters/";
    var pngDir = root + "/03 Shirt Mockups/PNG Exports/";
    var logoWhite = root + "/02 Logos/PCC-Logo-White.png";
    var logoDark = root + "/02 Logos/PCC-Logo.png";

    function rgb(r, g, b) {
        var c = new SolidColor();
        c.rgb.red = r; c.rgb.green = g; c.rgb.blue = b;
        return c;
    }

    var BLACK = rgb(10, 10, 12);
    var RED = rgb(218, 18, 34);
    var WHITE = rgb(245, 245, 243);
    var GREY = rgb(80, 80, 84);
    var GREEN = rgb(0, 122, 77);
    var BLUE = rgb(0, 70, 173);
    var GOLD = rgb(255, 184, 28);

    function fillPolygon(doc, group, name, points, color, opacity) {
        var layer = group.artLayers.add();
        layer.name = name;
        doc.activeLayer = layer;
        doc.selection.select(points);
        doc.selection.fill(color);
        doc.selection.deselect();
        layer.opacity = opacity === undefined ? 100 : opacity;
        return layer;
    }

    function fillRect(doc, group, name, x1, y1, x2, y2, color, opacity) {
        return fillPolygon(doc, group, name, [[x1,y1],[x2,y1],[x2,y2],[x1,y2]], color, opacity);
    }

    function loadTransparency() {
        var setDesc = new ActionDescriptor();
        var selectionRef = new ActionReference();
        selectionRef.putProperty(charIDToTypeID("Chnl"), charIDToTypeID("fsel"));
        setDesc.putReference(charIDToTypeID("null"), selectionRef);
        var transRef = new ActionReference();
        transRef.putEnumerated(charIDToTypeID("Chnl"), charIDToTypeID("Chnl"), charIDToTypeID("Trsp"));
        setDesc.putReference(charIDToTypeID("T   "), transRef);
        executeAction(charIDToTypeID("setd"), setDesc, DialogModes.NO);
    }

    function addColourway(doc, baseLayer, group, edition) {
        if (edition === "BLACK") return;
        doc.activeLayer = baseLayer;
        loadTransparency();
        var tint = group.artLayers.add();
        tint.name = edition === "WHITE" ? "Garment Colour - White" : "Garment Colour - Red";
        doc.activeLayer = tint;
        doc.selection.fill(edition === "WHITE" ? WHITE : RED);
        doc.selection.deselect();
        tint.blendMode = edition === "WHITE" ? BlendMode.SCREEN : BlendMode.NORMAL;
        tint.opacity = edition === "WHITE" ? 88 : 78;
    }

    function placeRaster(doc, group, path, name, width, x, y) {
        var source = app.open(new File(path));
        source.selection.selectAll();
        source.selection.copy();
        source.close(SaveOptions.DONOTSAVECHANGES);
        app.activeDocument = doc;
        var layer = doc.paste();
        layer.name = name;
        layer.move(group, ElementPlacement.INSIDE);
        var currentWidth = layer.bounds[2].as("px") - layer.bounds[0].as("px");
        var scale = width / currentWidth * 100;
        layer.resize(scale, scale, AnchorPosition.MIDDLECENTER);
        layer.translate(x - layer.bounds[0].as("px"), y - layer.bounds[1].as("px"));
        return layer;
    }

    function addText(doc, group, name, content, x, y, size, color, align) {
        var layer = group.artLayers.add();
        layer.kind = LayerKind.TEXT;
        layer.name = name;
        layer.textItem.contents = content;
        layer.textItem.position = [x, y];
        layer.textItem.size = size;
        layer.textItem.color = color;
        layer.textItem.font = "Arial-BoldMT";
        layer.textItem.justification = align || Justification.CENTER;
        return layer;
    }

    function checkerFade(doc, group, width, height, startY) {
        var checker = group.layerSets.add();
        checker.name = "Checkerboard Fade";
        var cols = 10, rows = 4;
        var startX = width * 0.27, endX = width * 0.73;
        var cellW = (endX - startX) / cols;
        var cellH = height * 0.045;
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                if ((r + c) % 2 === 0) {
                    fillRect(doc, checker, "Check " + r + "-" + c,
                        startX + c * cellW, startY + r * cellH,
                        startX + (c + 1) * cellW, startY + (r + 1) * cellH,
                        GREY, 10 + r * 7);
                }
            }
        }
    }

    function addFrontArtwork(doc, edition, role) {
        var w = doc.width.as("px"), h = doc.height.as("px");
        var art = doc.layerSets.add(); art.name = "02 PCC Artwork";
        var panels = art.layerSets.add(); panels.name = "Side Panels & Piping";

        fillPolygon(doc, panels, "Left Red Panel",
            [[w*.275,h*.43],[w*.30,h*.47],[w*.315,h*.88],[w*.285,h*.91],[w*.265,h*.55]], RED, 94);
        fillPolygon(doc, panels, "Right Red Panel",
            [[w*.725,h*.43],[w*.70,h*.47],[w*.685,h*.88],[w*.715,h*.91],[w*.735,h*.55]], RED, 94);
        fillPolygon(doc, panels, "Left White Piping",
            [[w*.305,h*.46],[w*.315,h*.48],[w*.33,h*.88],[w*.322,h*.89]], WHITE, 100);
        fillPolygon(doc, panels, "Right White Piping",
            [[w*.695,h*.46],[w*.685,h*.48],[w*.67,h*.88],[w*.678,h*.89]], WHITE, 100);

        var trim = art.layerSets.add(); trim.name = "Collar & Cuff Trim";
        fillPolygon(doc, trim, "Left Collar Red", [[w*.37,h*.14],[w*.49,h*.19],[w*.485,h*.205],[w*.365,h*.16]], RED, 100);
        fillPolygon(doc, trim, "Right Collar Red", [[w*.63,h*.14],[w*.51,h*.19],[w*.515,h*.205],[w*.635,h*.16]], RED, 100);
        fillRect(doc, trim, "Left Cuff Red", w*.16,h*.40,w*.29,h*.415,RED,100);
        fillRect(doc, trim, "Right Cuff Red", w*.71,h*.40,w*.84,h*.415,RED,100);

        checkerFade(doc, art, w, h, h*.76);

        var badge = art.layerSets.add(); badge.name = "Logos, Flag & Identification";
        var logoPath = edition === "WHITE" ? logoDark : logoWhite;
        placeRaster(doc, badge, logoPath, "PCC Chest Logo", w*.14, w*.60, h*.27);

        // Compact South African sleeve flag.
        fillRect(doc, badge, "Flag Red", w*.175,h*.34,w*.235,h*.36,RED,100);
        fillRect(doc, badge, "Flag Blue", w*.175,h*.36,w*.235,h*.38,BLUE,100);
        fillPolygon(doc, badge, "Flag Green", [[w*.175,h*.34],[w*.205,h*.36],[w*.175,h*.38],[w*.188,h*.38],[w*.218,h*.36],[w*.188,h*.34]], GREEN,100);
        fillPolygon(doc, badge, "Flag Gold Black", [[w*.175,h*.347],[w*.195,h*.36],[w*.175,h*.373]], GOLD,100);

        var titleColor = edition === "WHITE" ? BLACK : WHITE;
        addText(doc,badge,"Player Name","TUMELO MMOLA",w*.43,h*.31,w*.012,titleColor,Justification.CENTER);
        addText(doc,badge,"Role",role,w*.43,h*.335,w*.011,RED,Justification.CENTER);
    }

    function addBackArtwork(doc, edition) {
        var w = doc.width.as("px"), h = doc.height.as("px");
        var art = doc.layerSets.add(); art.name = "02 PCC Artwork";
        var panels = art.layerSets.add(); panels.name = "Side Panels & Piping";
        fillPolygon(doc, panels, "Left Red Panel", [[w*.23,h*.42],[w*.255,h*.47],[w*.27,h*.89],[w*.235,h*.91],[w*.22,h*.54]],RED,94);
        fillPolygon(doc, panels, "Right Red Panel", [[w*.77,h*.42],[w*.745,h*.47],[w*.73,h*.89],[w*.765,h*.91],[w*.78,h*.54]],RED,94);
        checkerFade(doc, art, w, h, h*.75);
        var type = art.layerSets.add(); type.name = "Back Typography";
        var tc = edition === "WHITE" ? BLACK : WHITE;
        addText(doc,type,"Polokwane","POLOKWANE",w*.5,h*.28,w*.035,RED,Justification.CENTER);
        addText(doc,type,"Chess Club","CHESS CLUB",w*.5,h*.325,w*.035,tc,Justification.CENTER);
        addText(doc,type,"Established","-  EST 1958  -",w*.5,h*.36,w*.016,tc,Justification.CENTER);
    }

    function saveOutputs(doc, baseName) {
        var psd = new File(psdDir + baseName + ".psd");
        var psdOptions = new PhotoshopSaveOptions();
        psdOptions.layers = true;
        psdOptions.embedColorProfile = true;
        doc.saveAs(psd, psdOptions, true, Extension.LOWERCASE);
        var png = new File(pngDir + baseName + ".png");
        var pngOptions = new PNGSaveOptions();
        pngOptions.compression = 6;
        doc.saveAs(png, pngOptions, true, Extension.LOWERCASE);
    }

    function build(view, edition, role, suffix) {
        var baseFile = view === "FRONT" ? frontBase : backBase;
        var source = app.open(baseFile);
        source.activeLayer.name = "01 Photorealistic Garment Base";
        var baseLayer = source.activeLayer;
        var colourGroup = source.layerSets.add();
        colourGroup.name = "Garment Colour";
        addColourway(source, baseLayer, colourGroup, edition);
        if (view === "FRONT") addFrontArtwork(source, edition, role || "PLAYER");
        else addBackArtwork(source, edition);
        var name = "PCC-" + edition.toLowerCase() + "-" + view.toLowerCase() + (suffix ? "-" + suffix.toLowerCase() : "");
        saveOutputs(source, name);
        source.close(SaveOptions.DONOTSAVECHANGES);
    }

    build("FRONT","BLACK","PLAYER","");
    build("BACK","BLACK","","");
    build("FRONT","WHITE","PLAYER","");
    build("BACK","WHITE","","");
    build("FRONT","RED","PLAYER","");
    build("BACK","RED","","");
    build("FRONT","BLACK","CAPTAIN","captain");
    build("FRONT","WHITE","CAPTAIN","captain");
    build("FRONT","BLACK","MANAGER","manager");
    build("FRONT","WHITE","MANAGER","manager");
}());
