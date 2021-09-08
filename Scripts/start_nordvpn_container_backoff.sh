# $1 --name
# $2 Country
# $3 Language
docker run -it --rm --cap-add=NET_ADMIN --cap-add=SYS_MODULE --device /dev/net/tun --name $1 \
    --sysctl net.ipv4.conf.all.rp_filter=2 \
    --ulimit memlock=-1:-1 \
    --network twitch-net \
    -e USER=jasonliu9672@gmail.com -e PASS='ntur08921067' \
    -e CONNECT=$2 -e LANGUAGE=$3 \
    -e TECHNOLOGY=NordLynx \
    -v /home/nslab/Desktop/netwatcher-exp-bacoff:/home/netwatcher \
    -v /home/nslab/Desktop/envFiles/.bashrc:/root/.bashrc \
    -v /home/nslab/Desktop/envFiles/resolv.conf:/etc/resolv.conf \
    nslab/prober:official
