docker run -itd --rm --network twitch-net --name mongo \
    -v /home/nslab/Desktop/MongoData:/data/db \
    mongo
