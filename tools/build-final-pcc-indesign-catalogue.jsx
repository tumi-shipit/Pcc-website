#target "InDesign"

(function () {
    app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
    var root = new Folder("C:/Users/Tumelo/Documents/PCC Tournament Polo Catalogue");
    var mockups = root.fsName + "/03 Shirt Mockups/Catalogue Links/";
    var outIndd = new File(root.fsName + "/06 InDesign/PCC Tournament Polo Catalogue - Final Mockups V5.indd");
    var outIdml = new File(root.fsName + "/06 InDesign/PCC Tournament Polo Catalogue - Final Mockups V5.idml");
    var outPdf = new File(root.fsName + "/07 Exports/PCC Tournament Polo Catalogue - Final Mockups V5.pdf");

    function colour(doc, name, values) {
        var c;
        try { c = doc.colors.itemByName(name); c.name; }
        catch (_) {
            c = doc.colors.add({name:name, model:ColorModel.PROCESS, space:ColorSpace.CMYK, colorValue:values});
        }
        return c;
    }

    function text(page, layer, bounds, content, size, color, align) {
        var f = page.textFrames.add(layer, undefined, undefined, {geometricBounds:bounds, contents:content});
        f.textFramePreferences.insetSpacing = [0,0,0,0];
        f.parentStory.texts[0].pointSize = size;
        f.parentStory.texts[0].fillColor = color;
        f.parentStory.paragraphs[0].justification = align || Justification.LEFT_ALIGN;
        return f;
    }

    function place(page, layer, fileName, bounds) {
        fileName = fileName.replace(".png", ".jpg");
        var f = page.rectangles.add(layer, undefined, undefined, {
            geometricBounds: bounds,
            fillColor: "None",
            strokeWeight: 0
        });
        f.place(new File(mockups + fileName));
        f.fit(FitOptions.PROPORTIONALLY);
        f.fit(FitOptions.CENTER_CONTENT);
        f.bringToFront();
        return f;
    }

    function setupPage(page, layer, paper, title, subtitle, red, ink) {
        page.rectangles.add(layer, undefined, undefined, {
            geometricBounds:[0,0,297,420], fillColor:paper, strokeWeight:0
        }).sendToBack();
        text(page, layer, [12,16,24,404], title, 22, ink);
        text(page, layer, [27,16,37,404], subtitle, 8, red);
        page.graphicLines.add(layer, undefined, undefined, {
            geometricBounds:[42,16,42,404], strokeColor:red, strokeWeight:1
        });
    }

    var doc = app.documents.add();
    doc.documentPreferences.properties = {pageWidth:"420mm", pageHeight:"297mm", facingPages:false, pagesPerDocument:1};
    var layout = doc.layers[0]; layout.name = "01 Catalogue Layout";
    var renders = layout;
    var paper = colour(doc,"Catalogue Paper",[3,3,5,0]);
    var ink = colour(doc,"Catalogue Ink",[75,68,67,88]);
    var red = colour(doc,"PCC Red",[10,100,92,2]);

    var p1 = doc.pages[0];
    setupPage(p1,layout,paper,"HOME / AWAY COLLECTION","BLACK AND WHITE EDITIONS - FRONT & BACK",red,ink);
    place(p1,renders,"PCC-black-front.png",[48,20,250,112]);
    place(p1,renders,"PCC-black-back.png",[48,113,250,205]);
    place(p1,renders,"PCC-white-front.png",[48,215,250,307]);
    place(p1,renders,"PCC-white-back.png",[48,308,250,400]);
    text(p1,layout,[258,20,273,205],"BLACK HOME EDITION",10,ink,Justification.CENTER_ALIGN);
    text(p1,layout,[258,215,273,400],"WHITE AWAY EDITION",10,ink,Justification.CENTER_ALIGN);
    text(p1,layout,[279,16,289,404],"PCC TOURNAMENT POLO COLLECTION 2026  /  ONE CLUB. ONE FAMILY. ONE PURPOSE.",7,ink,Justification.CENTER_ALIGN);

    var p2 = doc.pages.add();
    setupPage(p2,layout,paper,"OFFICIAL TOURNAMENT COLLECTION","BLACK / WHITE / RED - FRONT & BACK",red,ink);
    var xs = [16,145,274];
    var editions = ["black","white","red"];
    for (var i=0;i<3;i++) {
        place(p2,renders,"PCC-"+editions[i]+"-front.png",[48,xs[i],242,xs[i]+62]);
        place(p2,renders,"PCC-"+editions[i]+"-back.png",[48,xs[i]+62,242,xs[i]+124]);
        text(p2,layout,[249,xs[i],263,xs[i]+124],editions[i].toUpperCase()+" EDITION",9,i===2?red:ink,Justification.CENTER_ALIGN);
    }
    text(p2,layout,[279,16,289,404],"PREMIUM PERFORMANCE. BUILT FOR TOURNAMENTS, TRAINING & CLUB EVENTS.",7,ink,Justification.CENTER_ALIGN);

    var p3 = doc.pages.add();
    setupPage(p3,layout,paper,"LEADERSHIP VERSIONS","CAPTAIN AND MANAGER - BLACK / WHITE",red,ink);
    place(p3,renders,"PCC-black-front-captain.png",[48,25,241,110]);
    place(p3,renders,"PCC-white-front-captain.png",[48,115,241,200]);
    place(p3,renders,"PCC-black-front-manager.png",[48,220,241,305]);
    place(p3,renders,"PCC-white-front-manager.png",[48,310,241,395]);
    text(p3,layout,[249,25,263,200],"CAPTAIN VERSIONS",9,ink,Justification.CENTER_ALIGN);
    text(p3,layout,[249,220,263,395],"MANAGER VERSIONS",9,ink,Justification.CENTER_ALIGN);
    text(p3,layout,[279,16,289,404],"MAKE IT YOURS. WEAR IT WITH PRIDE.",7,red,Justification.CENTER_ALIGN);

    doc.save(outIndd);
    doc.exportFile(ExportFormat.INDESIGN_MARKUP,outIdml,false);
    var preset;
    try { preset=app.pdfExportPresets.itemByName("[High Quality Print]"); preset.name; }
    catch (_) { preset=app.pdfExportPresets[0]; }
    doc.exportFile(ExportFormat.PDF_TYPE,outPdf,false,preset);
    doc.save();
    app.activeWindow.activePage=p1;
    app.activeWindow.zoom(ZoomOptions.FIT_PAGE);
}());
