#!/bin/sh

shopt -s extglob

cp ./src/!(*.ts) dist
cp -R ./static/ dist/static