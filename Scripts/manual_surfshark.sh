SERVERID=$1
COUNTRY=$2
CONTAINERNAME="probe-manual-$SERVERID"
LANGUAGES='zh,en,es,ko,fr'
PERCENTAGES='80,60,60,80,80'

docker run -it --rm --cap-add=NET_ADMIN --cap-add=SYS_MODULE --device /dev/net/tun --name $CONTAINERNAME \
    --network jujuby_main-net\
    -e SURFSHARK_USER=3pKdBuSbDrjNgXkBpqXtrHnQ \
    -e SURFSHARK_PASSWORD=82ZXBMqW8VhKNn4wgskAXJx7 \
    -e SURFSHARK_COUNTRY=ru -e SURFSHARK_CITY=mos \
    -e CONNECT=$SERVERID -e LANGUAGE=$LANGUAGES -e PERCENTAGES=$PERCENTAGES \
    -e COUNTRY=$COUNTRY \
    -e CONTROLLER_IP=172.27.0.2 \
    -v /home/nslab/Desktop/Jujuby/Prober:/home/Prober \
    nslab/prober-shark:2.0 
