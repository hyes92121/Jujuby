docker run -itd --rm --cap-add=NET_ADMIN --cap-add=SYS_MODULE --device /dev/net/tun --name test \
            --sysctl net.ipv4.conf.all.rp_filter=2 \
            --ulimit memlock=-1:-1 \
            -e USER=jasonliu9672@gmail.com -e PASS='ntur08921067' \
            -e CONNECT=Korea -e TECHNOLOGY=NordLynx -d bubuntux/nordvpn:3.7.4
