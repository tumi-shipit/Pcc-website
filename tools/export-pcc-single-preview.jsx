#target photoshop

(function () {
    app.displayDialogs = DialogModes.NO;
    var input = new File("C:/Users/Tumelo/Documents/PCC Tournament Polo Catalogue/03 Shirt Mockups/Collection 3 Tracksuit Jacket and Hoodie/Fully Layered Masters/PCC-jacket-front-FULLY-LAYERED.psd");
    var output = new File("C:/Users/Tumelo/pcc-website/tmp/layered-masters/previews/PCC-jacket-front-CORRECTED.png");
    var doc = app.open(input);
    var options = new PNGSaveOptions();
    options.compression = 3;
    options.interlaced = false;
    doc.saveAs(output, options, true, Extension.LOWERCASE);
    doc.close(SaveOptions.DONOTSAVECHANGES);
}());
