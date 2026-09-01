#target photoshop

(function () {
    app.displayDialogs = DialogModes.NO;
    var sourceRoot = "C:/Users/Tumelo/Documents/PCC Tournament Polo Catalogue/03 Shirt Mockups/Collection 3 Tracksuit Jacket and Hoodie/Fully Layered Masters/";
    var outputRoot = "C:/Users/Tumelo/pcc-website/tmp/layered-masters/previews/";
    var files = [
        "PCC-jacket-front-FULLY-LAYERED",
        "PCC-jacket-back-FULLY-LAYERED",
        "PCC-hoodie-front-FULLY-LAYERED",
        "PCC-hoodie-back-FULLY-LAYERED"
    ];

    for (var i = 0; i < files.length; i++) {
        var doc = app.open(new File(sourceRoot + files[i] + ".psd"));
        var options = new PNGSaveOptions();
        options.compression = 6;
        options.interlaced = false;
        doc.saveAs(new File(outputRoot + files[i] + ".png"), options, true, Extension.LOWERCASE);
        doc.close(SaveOptions.DONOTSAVECHANGES);
    }
}());
