Set WshShell = createObject("WScript.Shell")
Set FileSystem = CreateObject("Scripting.FileSystemObject")
ScriptFolder = FileSystem.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = ScriptFolder
WshShell.Run "cmd /c node nirfaa.js", 0, false