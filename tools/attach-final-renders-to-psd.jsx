#target photoshop

(function () {
    app.displayDialogs = DialogModes.NO;
    var root = "C:/Users/Tumelo/Documents/PCC Tournament Polo Catalogue/03 Shirt Mockups/";
    var names = [
        "PCC-black-front", "PCC-black-back",
        "PCC-white-front", "PCC-white-back",
        "PCC-red-front", "PCC-red-back",
        "PCC-black-front-captain", "PCC-white-front-captain",
        "PCC-black-front-manager", "PCC-white-front-manager"
    ];

    function addFinal(doc, pngPath) {
        var source = app.open(new File(pngPath));
        source.selection.selectAll();
        source.selection.copy();
        source.close(SaveOptions.DONOTSAVECHANGES);
        app.activeDocument = doc;
        var group = doc.layerSets.add();
        group.name = "00 FINAL PHOTOREALISTIC RENDER";
        var finalLayer = doc.paste();
        finalLayer.name = "Final Render - Use in InDesign";
        finalLayer.move(group, ElementPlacement.INSIDE);
    }

    for (var i = 0; i < names.length; i++) {
        var psdFile = new File(root + "PSD Masters/" + names[i] + ".psd");
        var pngFile = new File(root + "PNG Exports/" + names[i] + ".png");
        var doc;
        if (psdFile.exists) {
            doc = app.open(psdFile);
        } else {
            doc = app.open(pngFile);
            doc.activeLayer.name = "Final Render - Use in InDesign";
            var construction = doc.layerSets.add();
            construction.name = "EDITABLE ARTWORK SOURCE - see collection masters";
        }
        var existing;
        try {
            existing = doc.layerSets.getByName("00 FINAL PHOTOREALISTIC RENDER");
            existing.remove();
        } catch (_) {}
        if (psdFile.exists) addFinal(doc, pngFile.fsName);
        var options = new PhotoshopSaveOptions();
        options.layers = true;
        options.embedColorProfile = true;
        doc.saveAs(psdFile, options, true, Extension.LOWERCASE);
        doc.close(SaveOptions.DONOTSAVECHANGES);
    }
}());
