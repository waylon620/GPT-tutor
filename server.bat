@echo off
@echo Starting server...
start http-server -p 1111
start python bing.py 
cd backend 
start go run main.go 