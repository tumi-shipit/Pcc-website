#target photoshop

(function () {
    app.displayDialogs = DialogModes.NO;
    var root = "C:/Users/Tumelo/Documents/PCC Tournament Polo Catalogue/03 Shirt Mockups/";
    var names = [
        "PCC-black-front", "PCC-black-back",
        "PCC-red-front", "PCC-red-back",
        "PCC-white-front", "PCC-white-back",
        "PCC-black-front-captain", "PCC-black-front-manager",
        "PCC-white-front-captain", "PCC-white-front-manager"
    ];

    for (var i = 0; i < names.length; i++) {
        var doc = app.open(new File(root + "PNG Exports/" + names[i] + ".png"));
        doc.activeLayer.name = "00 Final Solid-Trim Photorealistic Render";
        var guide = doc.layerSets.add();
        guide.name = "01 SOLID TRIM SPECIFICATION";
        guide.artLayers.add().name = "Collar - Solid Black, No Piping";
        guide.artLayers.add().name = names[i].indexOf("PCC-black") === 0 ? "Sleeve Cuffs - Solid Red" : "Sleeve Cuffs - Solid Black";
        guide.artLayers.add().name = "No Stripe or Tipping Lines";
        guide.visible = false;

        var options = new PhotoshopSaveOptions();
        options.layers = true;
        options.embedColorProfile = true;
        doc.saveAs(new File(root + "PSD Masters/" + names[i] + ".psd"), options, true, Extension.LOWERCASE);
        doc.close(SaveOptions.DONOTSAVECHANGES);
    }
}());
