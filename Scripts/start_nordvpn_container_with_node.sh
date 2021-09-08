# $1 --name
# $2 Country
# $3 Language
# docker run -it --rm --cap-add=NET_ADMIN --cap-add=SYS_MODULE --device /dev/net/tun --name $1 \
#     --sysctl net.ipv4.conf.all.rp_filter=2 \
#     --ulimit memlock=-1:-1 \
#     -e USER=jasonliu9672@gmail.com -e PASS='ntur08921067' \
#     -e CONNECT=$2 -e LANGUAGE=$3 \
#     -e TECHNOLOGY=NordLynx \
#     -v /home/nslab/Desktop/Jujuby/Prober:/home/Prober \
#     -v /home/nslab/Desktop/Jujuby/.envFiles/.bashrc:/root/.bashrc \
#     -v /home/nslab/Desktop/Jujuby/.envFiles/resolv.conf:/etc/resolv.conf \
#     nslab/prober:official

docker run -itd --rm --cap-add=NET_ADMIN --cap-add=SYS_MODULE --device /dev/net/tun --name probe_test\
    --sysctl net.ipv4.conf.all.rp_filter=2 \
    --ulimit memlock=-1:-1 \
    --network jujuby_main-net\
    -e USER=jasonliu9672@gmail.com -e PASS='Ntunslab123!@#' \
    -e CONNECT=Taiwan -e LANGUAGE=zh -e PERCENTAGES=80 \
    -e TECHNOLOGY=NordLynx \
    -e COUNTRY=Taiwan \
    -e CONTROLLER_IP=172.23.0.4 \
    -e ID=jncV6Ies- \
    -v /home/nslab/Desktop/Jujuby/Prober:/home/Prober \
    -v /home/nslab/Desktop/Jujuby/.envFiles/resolv.conf:/etc/resolv.conf \
    nslab/prober:2.0