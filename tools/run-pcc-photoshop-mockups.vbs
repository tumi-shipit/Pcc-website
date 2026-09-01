Option Explicit

Dim photoshopApp
Dim scriptPath

scriptPath = "C:\Users\Tumelo\pcc-website\tools\package-pcc-solid-trim-polo-psd.jsx"
Set photoshopApp = CreateObject("Photoshop.Application.190")
photoshopApp.Visible = True
photoshopApp.DoJavaScriptFile scriptPath
