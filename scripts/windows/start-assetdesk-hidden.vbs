' Lanza AssetDesk sin ventana negra (para Inicio de Windows / Task Scheduler)
Option Explicit

Dim shell, fso, scriptDir, batPath, appDir
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = fso.BuildPath(scriptDir, "start-assetdesk.bat")
appDir = fso.GetParentFolderName(fso.GetParentFolderName(scriptDir))

If Not fso.FileExists(batPath) Then
  WScript.Quit 1
End If

shell.CurrentDirectory = appDir
' 0 = oculto, False = no esperar
shell.Run "cmd.exe /c """ & batPath & """", 0, False
