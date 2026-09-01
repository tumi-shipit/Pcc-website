#target photoshop

(function () {
    app.displayDialogs = DialogModes.NO;
    var root = "C:/Users/Tumelo/Documents/PCC Tournament Polo Catalogue/03 Shirt Mockups/Collection 3 Tracksuit Jacket and Hoodie/";
    var names = [
        "jacket-black-front", "jacket-black-back",
        "jacket-red-front", "jacket-red-back",
        "jacket-white-front", "jacket-white-back",
        "hoodie-black-front", "hoodie-black-back",
        "hoodie-red-front", "hoodie-red-back",
        "hoodie-white-front", "hoodie-white-back"
    ];

    for (var i = 0; i < names.length; i++) {
        var doc = app.open(new File(root + "PNG Exports/" + names[i] + ".png"));
        doc.activeLayer.name = "00 Final Photorealistic Garment Render";

        var components = doc.layerSets.add();
        components.name = "01 Artwork Guide Components";
        components.artLayers.add().name = "PCC Crest and Club Branding";
        components.artLayers.add().name = "Name and Role Personalisation";
        components.artLayers.add().name = "South African Flag Patch";
        components.artLayers.add().name = "Checkerboard Sublimation";
        components.artLayers.add().name = "Garment Construction Notes";
        components.visible = false;

        var options = new PhotoshopSaveOptions();
        options.layers = true;
        options.embedColorProfile = true;
        doc.saveAs(new File(root + "PSD Masters/" + names[i] + ".psd"), options, true, Extension.LOWERCASE);
        doc.close(SaveOptions.DONOTSAVECHANGES);
    }
}());
