#target photoshop

(function () {
    app.displayDialogs = DialogModes.NO;
    var root = "C:/Users/Tumelo/Documents/PCC Tournament Polo Catalogue/03 Shirt Mockups/Collection 3 Tracksuit Jacket and Hoodie/";

    function findByPrefix(container, prefix) {
        for (var i = 0; i < container.layers.length; i++) {
            var layer = container.layers[i];
            if (layer.name.indexOf(prefix) === 0) return layer;
            if (layer.typename === "LayerSet") {
                var found = findByPrefix(layer, prefix);
                if (found) return found;
            }
        }
        return null;
    }

    function setTextColor(layer, rgb) {
        if (!layer || layer.kind !== LayerKind.TEXT) return;
        var color = new SolidColor();
        color.rgb.red = rgb[0];
        color.rgb.green = rgb[1];
        color.rgb.blue = rgb[2];
        layer.textItem.color = color;
    }

    function exportVariant(garment, colour) {
        var master = root + "Fully Layered Masters/PCC-" + garment + "-back-FULLY-LAYERED.psd";
        var doc = app.open(new File(master));

        var black = findByPrefix(doc, "01 BLACK");
        var red = findByPrefix(doc, "01 RED");
        var white = findByPrefix(doc, "01 WHITE");
        black.visible = colour === "black";
        red.visible = colour === "red";
        white.visible = colour === "white";

        var polokwane = findByPrefix(doc, "EDIT POLKWANE");
        var chessClub = findByPrefix(doc, "EDIT CHESS CLUB");
        var est = findByPrefix(doc, "EDIT EST 1958");

        if (colour === "black") {
            setTextColor(polokwane, [230, 20, 30]);
            setTextColor(chessClub, [255, 255, 255]);
            setTextColor(est, [255, 255, 255]);
        } else if (colour === "red") {
            setTextColor(polokwane, [15, 15, 15]);
            setTextColor(chessClub, [255, 255, 255]);
            setTextColor(est, [15, 15, 15]);
        } else {
            setTextColor(polokwane, [200, 15, 25]);
            setTextColor(chessClub, [15, 15, 15]);
            setTextColor(est, [15, 15, 15]);
        }

        var baseName = garment + "-" + colour + "-back";
        var psdOptions = new PhotoshopSaveOptions();
        psdOptions.layers = true;
        psdOptions.embedColorProfile = true;
        doc.saveAs(new File(root + "PSD Masters/" + baseName + ".psd"), psdOptions, true, Extension.LOWERCASE);

        var background = findByPrefix(doc, "00 BACKGROUND");
        if (background) background.visible = false;
        var pngOptions = new PNGSaveOptions();
        pngOptions.compression = 6;
        pngOptions.interlaced = false;
        doc.saveAs(new File(root + "PNG Exports/" + baseName + ".png"), pngOptions, true, Extension.LOWERCASE);
        doc.close(SaveOptions.DONOTSAVECHANGES);
    }

    var garments = ["jacket", "hoodie"];
    var colours = ["black", "red", "white"];
    for (var g = 0; g < garments.length; g++) {
        for (var c = 0; c < colours.length; c++) {
            exportVariant(garments[g], colours[c]);
        }
    }
}());
