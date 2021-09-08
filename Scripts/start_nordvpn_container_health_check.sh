# COUNTRY=$1
docker run -it --rm --cap-add=NET_ADMIN --cap-add=SYS_MODULE --device /dev/net/tun --name $1 \
    --sysctl net.ipv4.conf.all.rp_filter=2 \
    --ulimit memlock=-1:-1 \
    -e USER=jasonliu9672@gmail.com -e PASS='ntur08921067' \
    -e CONNECT=$2 -e TECHNOLOGY=NordLynx \
    --network twitch-net \
    -v /home/nslab/Desktop/envFiles/resolv.conf:/etc/resolv.conf \
    bubuntux/nordvpn:3.7.4
