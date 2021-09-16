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

# SERVERID='us8667'
# COUNTRY='United_States'
SERVERID=$1
COUNTRY=$2
CONTAINERNAME="probe-manual-$SERVERID"
LANGUAGES='zh,en,es,ko,fr'
PERCENTAGES='80,60,60,80,80'

docker run -it --rm --cap-add=NET_ADMIN --cap-add=SYS_MODULE --device /dev/net/tun --name $CONTAINERNAME \
    --sysctl net.ipv4.conf.all.rp_filter=2 \
    --ulimit memlock=-1:-1 \
    -e USER=hyes92121@gmail.com -e PASS='Ntunslab123!@#' \
    -e CONNECT=$SERVERID -e LANGUAGE=$LANGUAGES -e PERCENTAGES=$PERCENTAGES \
    -e COUNTRY=$COUNTRY \
    -e TECHNOLOGY=NordLynx \
    -e CONTROLLER_IP=172.27.0.2 \
    nslab/prober:2.0
#     -v /home/caleb/Jujuby/Prober:/home/Prober \
#     -v /home/caleb/Jujuby/.envFiles/resolv.conf:/etc/resolv.conf \
#     nslab/prober:2.0
