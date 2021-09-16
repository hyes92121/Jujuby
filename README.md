# Jujuby
Jujuby is a crawler that leverages Twitch internal mechanisms and VPNs to discover content servers hosting Twitch streams. Jujuby can be run directly on the host machine to send requests from your local network, or run in a Docker container to proxy requests through VPN servers. 

## Getting Started 
### Prerequisites: 
Before starting, make sure the following prerequisites are installed on your machine: 
- Node.js
- npm 
- docker
- docker-compose 


### Running on your host machine 
*Prerequisites: You should already have ***Node.js*** and ***npm*** installed on your machine. Inside `Jujuby/Prober/`, run `npm install`*
- **Get content server address of a stream** 
    - Navigate to `Jujuby/Prober/Utils/` and run `node getEdgeAddr.js STREAM_NAME` where `STREAM_NAME` is to be substituted with a stream of your choice. 
    - Given the stream is live, you should see this line logged on the screen:  
    ```
    ...
    ...
    Content server address for STREAM_NAME is 45.113.129.132
    ```
- **Discover multiple content server addresses**
    - Navigate to `Jujuby/Prober/Utils/` and run `node getAllEdge.js STREAM_NAME` where `STREAM_NAME` is to be substituted with a stream of your choice.
    - Break condition of the algorithm can be customized. 

### Running in Docker 
*Prerequisites: You should already have [Docker](https://docs.docker.com/engine/install/ubuntu/) installed on you machine*
- **Build a prober container**
    - Navigate to `Jujuby/Dockerfiles/` and run `docker build -f Dockerfile.prober -t nslab/prober:2.0` 
    - Please ensure that the image name is correctly tagged as `nslab/prober:2.0`, as other scripts depend on this to work properly. 
- **Start a prober container connected to VPN**
    - Navigate to `Jujuby/Scripts` and run `sudo bash manual_run.sh SERVERID COUNTRY` 
    - `SERVERID` can be found using `curl --silent "https://api.nordvpn.com/v1/servers" | jq --raw-output '.[].hostname' | sort --version-sort`. Each line returned is in the format `SERVERID.nordvpn.com`, e.g., `us9263.nordvpn.com`. 
    - `COUNTRY` is the country corresponding to the country code within the `SERVERID` 
 
## Background 

## Visualiser Page 

## Authors 