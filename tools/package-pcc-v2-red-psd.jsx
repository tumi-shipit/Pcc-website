#target photoshop

(function () {
    app.displayDialogs = DialogModes.NO;
    var root = "C:/Users/Tumelo/Documents/PCC Tournament Polo Catalogue/03 Shirt Mockups/Version 2 Chess Pieces/";
    var names = ["V2-red-front", "V2-red-back"];
    for (var i=0; i<names.length; i++) {
        var doc = app.open(new File(root + "PNG Exports/" + names[i] + ".png"));
        doc.activeLayer.name = "00 Final Photorealistic Render";
        var art = doc.layerSets.add(); art.name = "01 Editable Artwork Components";
        art.artLayers.add().name = "PCC Logo & Identification";
        art.artLayers.add().name = "Side Panels & Piping";
        art.artLayers.add().name = "Chess Piece Hem Graphic";
        art.artLayers.add().name = "Collar, Cuffs & Shoulder Accent";
        art.visible = false;
        var options = new PhotoshopSaveOptions(); options.layers = true; options.embedColorProfile = true;
        doc.saveAs(new File(root + "PSD Masters/" + names[i] + ".psd"), options, true, Extension.LOWERCASE);
        doc.close(SaveOptions.DONOTSAVECHANGES);
    }
}());
