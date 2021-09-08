#!/bin/sh
DIR=`date +%y%m%d`
DEST=~/Desktop/MongoDataBackup/$DIR
mkdir $DEST
sudo cp -r -p ~/Desktop/MongoData/ ${DEST}
sudo chown -R $(whoami) ${DEST}/MongoData/