SERVERID=$1
COUNTRY=$2
CONTAINERNAME="probe-manual-$SERVERID"
LANGUAGES='zh,en,es,ko,fr'
PERCENTAGES='80,60,60,80,80'

docker run -it --rm --cap-add=NET_ADMIN --cap-add=SYS_MODULE --device /dev/net/tun --name $CONTAINERNAME \
    --sysctl net.ipv4.conf.all.rp_filter=2 \
    --ulimit memlock=-1:-1 \
    --network jujuby_main-net\
    -e USER=pollyhuang@ntu.edu.tw -e PASS='n$1abR0cks' \
    -e CONNECT=$SERVERID -e LANGUAGE=$LANGUAGES -e PERCENTAGES=$PERCENTAGES \
    -e COUNTRY=$COUNTRY \
    -e TECHNOLOGY=NordLynx \
    -e CONTROLLER_IP=172.27.0.2 \
    -v /home/nslab/Desktop/Jujuby/Prober:/home/Prober \
    -v /home/nslab/Desktop/Jujuby/.envFiles/resolv.conf:/etc/resolv.conf \
    nslab/prober:2.0
