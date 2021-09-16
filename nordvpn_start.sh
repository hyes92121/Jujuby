#!/bin/bash
[[ -n ${DEBUG} ]] && set -x
#if DEBUG is not null, 顯示環境變數以及bash內的變數以及執行參數
[[ -n ${COUNTRY} && -z ${CONNECT} ]] && CONNECT=${COUNTRY}
#if Country is not null and Connect is null(length 0), Connect = Country
DOCKER_NET="$(ip -o addr show dev eth0 | awk '$3 == "inet" {print $4}')" 
# get eth0 ipv4 address from [inet 172.27.0.5/16 brd 172.27.255.255 scope global eth0]
#global ：允許來自所有來源的連線；
#brd stands for broadcast

kill_switch() {
	iptables -F
    #清除所有的已訂定的規則
	iptables -X
    #殺掉所有使用者 "自訂" 的 chain 
    iptables -P INPUT DROP
	iptables -P FORWARD DROP
	iptables -P OUTPUT DROP
    # 設定政策(當你的封包不在你設定的規則之內時，則該封包的通過與否，是以 Policy 的設定為準),將本機的INPUT,FORWARD,OUTPUT設定為DROP
    iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
    #-io 網路介面：設定封包進出的介面規範
    #-i ：封包所進入的那個網路介面，例如 eth0, lo 等介面。需與 INPUT 鏈配合；
    #-o ：封包所傳出的那個網路介面，需與 OUTPUT 鏈配合；
	iptables -A INPUT -i lo -j ACCEPT
    #接受所有由loopback interface進來的封包
	iptables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
    #在Filter的Forward chain添加規則,使用conntrack這個module來對所有有ESTABLISHED或RELATED state的packet給予放行
	iptables -A FORWARD -i lo -j ACCEPT
	iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
	iptables -A OUTPUT -o lo -j ACCEPT
	iptables -A OUTPUT -o tap+ -j ACCEPT
	iptables -A OUTPUT -o tun+ -j ACCEPT
    iptables -A OUTPUT -o nordlynx -j ACCEPT
    iptables -t nat -A POSTROUTING -o tap+ -j MASQUERADE
    #在NAT表/POSTROUTING加一行規則,由eth0輸出時，作MASQUERADE(偽造)~將source IP Address改成eth0的IP Address再輸出
	iptables -t nat -A POSTROUTING -o tun+ -j MASQUERADE
	iptables -t nat -A POSTROUTING -o nordlynx -j MASQUERADE
    iptables  -A OUTPUT -p udp -m udp --dport 53    -j ACCEPT
    # DNS（域名服務系統）default port
    iptables  -A OUTPUT -p udp -m udp --dport 51820 -j ACCEPT

    iptables  -A OUTPUT -p tcp -m tcp --dport 1194  -j ACCEPT
    # OpenVPN port
    iptables  -A OUTPUT -p udp -m udp --dport 1194  -j ACCEPT
    iptables  -A OUTPUT -p tcp -m tcp --dport 443   -j ACCEPT
    # HTTPS
    	if [[ -n ${DOCKER_NET} ]]; then
        #Allow packets from and to docker net to be accepted
		iptables -A INPUT -s "${DOCKER_NET}" -j ACCEPT
		iptables -A FORWARD -d "${DOCKER_NET}" -j ACCEPT
		iptables -A FORWARD -s "${DOCKER_NET}" -j ACCEPT
		iptables -A OUTPUT -d "${DOCKER_NET}" -j ACCEPT
	fi
	[[ -n ${NETWORK} ]]  && for net in ${NETWORK//[;,]/ };  do return_route "${net}";  done