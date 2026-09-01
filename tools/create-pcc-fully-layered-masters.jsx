#target photoshop

(function () {
    app.displayDialogs = DialogModes.NO;

    var assetRoot = "C:/Users/Tumelo/pcc-website/tmp/layered-masters/assets/";
    var logoRoot = "C:/Users/Tumelo/Documents/PCC Tournament Polo Catalogue/02 Logos/";
    var outputRoot = "C:/Users/Tumelo/Documents/PCC Tournament Polo Catalogue/03 Shirt Mockups/Collection 3 Tracksuit Jacket and Hoodie/Fully Layered Masters/";

    function importLayer(doc, path, name, group) {
        var source = app.open(new File(path));
        var layer = source.activeLayer.duplicate(doc, ElementPlacement.PLACEATBEGINNING);
        source.close(SaveOptions.DONOTSAVECHANGES);
        app.activeDocument = doc;
        layer.name = name;
        return layer;
    }

    function scaleWidth(layer, targetWidth) {
        var bounds = layer.bounds;
        var width = bounds[2].as("px") - bounds[0].as("px");
        var percent = targetWidth / width * 100;
        layer.resize(percent, percent, AnchorPosition.MIDDLECENTER);
    }

    function centerAt(layer, x, y) {
        var bounds = layer.bounds;
        var cx = (bounds[0].as("px") + bounds[2].as("px")) / 2;
        var cy = (bounds[1].as("px") + bounds[3].as("px")) / 2;
        layer.translate(x - cx, y - cy);
    }

    function textLayer(group, name, contents, x, y, size, rgb) {
        var layer = group.artLayers.add();
        layer.kind = LayerKind.TEXT;
        layer.name = name;
        layer.textItem.kind = TextType.POINTTEXT;
        layer.textItem.contents = contents;
        layer.textItem.position = [x, y];
        layer.textItem.size = size;
        layer.textItem.font = "Arial-BoldMT";
        layer.textItem.justification = Justification.CENTER;
        var color = new SolidColor();
        color.rgb.red = rgb[0];
        color.rgb.green = rgb[1];
        color.rgb.blue = rgb[2];
        layer.textItem.color = color;
        return layer;
    }

    function build(garment, view) {
        var blackFile = assetRoot + garment + "-" + view + "-base-black.png";
        var doc = app.open(new File(blackFile));
        var black = doc.activeLayer;
        black.name = "01 BLACK - Garment Base (Visible)";
        var width = doc.width.as("px");
        var height = doc.height.as("px");

        var background = doc.artLayers.add();
        background.name = "00 BACKGROUND - Light Grey (May Hide)";
        var backgroundColor = new SolidColor();
        backgroundColor.rgb.red = 238;
        backgroundColor.rgb.green = 238;
        backgroundColor.rgb.blue = 238;
        doc.selection.selectAll();
        doc.selection.fill(backgroundColor);
        doc.selection.deselect();
        background.move(black, ElementPlacement.PLACEAFTER);

        var red = importLayer(doc, assetRoot + garment + "-" + view + "-base-red.png", "01 RED - Garment Base (Hidden)", null);
        var white = importLayer(doc, assetRoot + garment + "-" + view + "-base-white.png", "01 WHITE - Garment Base (Hidden)", null);
        red.visible = false;
        white.visible = false;

        var pattern = importLayer(doc, assetRoot + garment + "-" + view + "-checkerboard.png", "02 CHECKERBOARD - Move / Resize / Hide", null);
        pattern.opacity = 65;

        var brandingGroup = doc.layerSets.add();
        brandingGroup.name = "03 PCC BRANDING";

        var personalizationGroup = doc.layerSets.add();
        personalizationGroup.name = "04 NAME AND ROLE - Edit Text";

        if (view == "front") {
            var logoWhite = importLayer(doc, logoRoot + "PCC-Logo-White.png", "03 PCC LOGO - White (Visible)", null);
            scaleWidth(logoWhite, width * 0.15);
            centerAt(logoWhite, width * 0.65, height * 0.34);
            var logoDark = importLayer(doc, logoRoot + "PCC-Logo.png", "03 PCC LOGO - Dark (For White Garment)", null);
            scaleWidth(logoDark, width * 0.15);
            centerAt(logoDark, width * 0.65, height * 0.34);
            logoDark.visible = false;

            textLayer(personalizationGroup, "EDIT NAME - Double Click T Icon", "TUMELO MHOLA", width * 0.36, height * 0.33, 18, [255, 255, 255]);
            textLayer(personalizationGroup, "EDIT ROLE - Double Click T Icon", "COACH", width * 0.36, height * 0.36, 14, [220, 20, 30]);

            var flag = importLayer(doc, assetRoot + "south-african-flag-official.jpg", "05 OFFICIAL SOUTH AFRICAN FLAG - Replaceable", null);
            scaleWidth(flag, width * 0.07);
            centerAt(flag, width * 0.18, height * 0.43);
        } else {
            var chessPiece = importLayer(doc, assetRoot + "chess-piece-red.png", "Chess Piece Graphic - Replaceable", brandingGroup);
            scaleWidth(chessPiece, width * 0.05);
            centerAt(chessPiece, width * 0.50, height * 0.22);
            textLayer(brandingGroup, "EDIT POLKWANE - Double Click T Icon", "POLKWANE", width * 0.50, height * 0.35, 34, [230, 20, 30]);
            textLayer(brandingGroup, "EDIT CHESS CLUB - Double Click T Icon", "CHESS CLUB", width * 0.50, height * 0.415, 31, [255, 255, 255]);
            textLayer(brandingGroup, "EDIT EST 1958 - Double Click T Icon", "EST 1958", width * 0.50, height * 0.47, 17, [255, 255, 255]);
        }

        var info = doc.layerSets.add();
        info.name = "06 INSTRUCTIONS - Toggle Colour, Edit Text, Replace Logo";
        info.visible = false;
        textLayer(info, "Production Note", "Select one garment colour. Use the dark logo/text on white garments.", width * 0.50, height * 0.08, 16, [255, 255, 255]);

        var options = new PhotoshopSaveOptions();
        options.layers = true;
        options.embedColorProfile = true;
        var title = "PCC-" + garment + "-" + view + "-FULLY-LAYERED.psd";
        doc.saveAs(new File(outputRoot + title), options, true, Extension.LOWERCASE);
        doc.close(SaveOptions.DONOTSAVECHANGES);
    }

    build("jacket", "front");
    build("jacket", "back");
    build("hoodie", "front");
    build("hoodie", "back");
}());
