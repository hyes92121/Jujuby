# docker run -it --rm --name controller -v /var/run/docker.sock:/var/run/docker.sock twitchcontroller
docker run -it --rm --network twitch-net --name controller \
-v /var/run/docker.sock:/var/run/docker.sock \
-v /home/nslab/Desktop/controller:/home/controller \
-p 22222:22222 \
nslab/controller
