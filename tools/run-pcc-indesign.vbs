Option Explicit

Dim inDesignApp
Dim scriptPath

scriptPath = "C:\Users\Tumelo\pcc-website\tools\build-final-pcc-indesign-catalogue.jsx"
Set inDesignApp = CreateObject("InDesign.Application.2025")
inDesignApp.DoScript scriptPath, 1246973031
