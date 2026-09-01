#target photoshop

(function () {
    app.displayDialogs = DialogModes.NO;

    var output = new File("C:/Users/Tumelo/pcc-website/tmp/photoshop/PCC-Photoshop-Automation-Test.psd");
    if (!output.parent.exists) output.parent.create();

    var doc = app.documents.add(1200, 800, 150, "PCC Photoshop Automation Test", NewDocumentMode.RGB, DocumentFill.WHITE);
    var group = doc.layerSets.add();
    group.name = "PCC Master Mockup";

    var garment = group.artLayers.add();
    garment.name = "01 Garment Base";
    doc.activeLayer = garment;
    var black = new SolidColor();
    black.rgb.red = 18;
    black.rgb.green = 18;
    black.rgb.blue = 18;
    doc.selection.select([[180, 120], [1020, 120], [1080, 690], [120, 690]]);
    doc.selection.fill(black);
    doc.selection.deselect();

    var artwork = group.artLayers.add();
    artwork.name = "02 Artwork Smart Object Placeholder";

    var lighting = group.artLayers.add();
    lighting.name = "03 Fabric Lighting";
    lighting.opacity = 35;

    var options = new PhotoshopSaveOptions();
    options.layers = true;
    options.embedColorProfile = true;
    doc.saveAs(output, options, true, Extension.LOWERCASE);
}());
