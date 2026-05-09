@echo off
echo Adding changes...

git add .

set /p msg=Enter commit message (default: update project): 
if "%msg%"=="" set msg=update project

git commit -m "%msg%"

echo Pushing to GitHub...

git push

echo Done!
pause