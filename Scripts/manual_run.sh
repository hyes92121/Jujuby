SERVERID=$1
COUNTRY=$2
CONTAINER_NAME="probe-manual-$SERVERID"
# String with language codes separated by commas
LANGUAGES='zh,en,es,ko,fr'
# String with numbers indicating the viewer percentage of a stream language. 80=80% 
PERCENTAGES='80,60,60,80,80'
PROJECT_ROOT=$(cat ../.envFiles/variables.env | grep "PROJECT_ROOT" | sed 's/=/\n/g' | tail -n 1)
# Credentials here are taken from the config file. Should a separate Nord VPN account be used, 
# you would need to manually replace the credentials with an alternative one. 
NORD_USER=$(cat ../.envFiles/variables.env | grep "NORD_USER" | sed 's/=/\n/g' | tail -n 1)
NORD_PWD=$(cat ../.envFiles/variables.env | grep "NORD_PWD" | sed 's/=/\n/g' | tail -n 1)


docker run -it --rm -d --cap-add=NET_ADMIN --cap-add=SYS_MODULE --device /dev/net/tun --name $CONTAINER_NAME \
    --sysctl net.ipv4.conf.all.rp_filter=2 \
    --ulimit memlock=-1:-1 \
    --net jujuby_main-net \
    -e USER=hyes92121@gmail.com -e PASS='Ntunslab123!@#' \
    -e CONNECT=$SERVERID -e LANGUAGE=$LANGUAGES -e PERCENTAGES=$PERCENTAGES \
    -e COUNTRY=$COUNTRY \
    -e TECHNOLOGY=NordLynx \
    -e CONTROLLER_IP=172.27.0.2 \
    -v $PROJECT_ROOT/.envFiles/resolv.conf:/etc/resolv.conf \
    nslab/prober:2.0

