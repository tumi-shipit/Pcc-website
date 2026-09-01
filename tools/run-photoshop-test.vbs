Option Explicit

Dim photoshopApp
Dim scriptPath

scriptPath = "C:\Users\Tumelo\pcc-website\tools\verify-photoshop-automation.jsx"
Set photoshopApp = CreateObject("Photoshop.Application.190")
photoshopApp.Visible = True
photoshopApp.DoJavaScriptFile scriptPath
