#target photoshop

(function () {
    app.displayDialogs = DialogModes.NO;
    for (var i = app.documents.length - 1; i >= 0; i--) {
        var doc = app.documents[i];
        var name = doc.name.toLowerCase();
        if (name.indexOf("jacket-") === 0 || name.indexOf("hoodie-") === 0) {
            doc.close(SaveOptions.DONOTSAVECHANGES);
        }
    }
}());
