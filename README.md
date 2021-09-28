# Jujuby
Jujuby is a crawler that leverages Twitch internal mechanisms and VPNs to discover content servers hosting Twitch streams. Jujuby can be run directly on the host machine to send requests from your local network, or run in a Docker container to proxy requests through VPN servers. 

## Getting Started 
### Prerequisites: 
Before starting, make sure the following prerequisites are installed on your machine: 
- Node.js
- npm 
- docker
- docker-compose 

First, we need to setup our credentials and project paths. Naviagte to `Jujuby/.envfiles` and modify `variables.env`. You should only change `NORD_USER`, `NORD_PWD`, and `PROJECT_ROOT` and leave the other variables as is.  

Next, we will need to unzip our dataset, which also contains the password for our crawler UI. Under the project root, type `tar -zxvf MongoData.tgz`. All project related data will be stored in this folder. 

Should you decide to use a clean database, a folder named `MongoData` is still required. Type `mkdir MongoData` under the project root. 

At this point, we have finished setting up the project. 

### Running on your host machine 
*Note: Project dependencies are not installed by default. To run on your host machine, you will need to install them first. Inside `Jujuby/Prober/`, run `npm install`*

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
*Note: Running the crawler using docker is to enable multiple simultaneous VPN connections on our host machine. Only do this if you require sending requests to Twitch from different network locations at once.*
- **Step 1: Build a prober container**
    - Under the project root, type `docker build -t nslab/prober:2.0 --build-arg NORDVPN_VERSION=3.7.4 -f Dockerfiles/Dockerfile.prober .`
    - Please ensure that the image name is correctly tagged as `nslab/prober:2.0`, as other scripts depend on this image to work properly. 

- **Step 2: Build utility containers and Jujuby UI**
    - Under the project root, type `docker-compose up -d`. 
    - This will start the UI server as well as the Mongo database. 
    - By default, the UI is run on `140.112.42.160:22222`. 
    - The username and password should be provided to you explicitly. 
    - This will build and start three containers, `jujuby_controller_1`, `mongodb`, and `cache`. Note that `cache` is currently not used, but will be in future updates. 

- **Step 3: Manually starting a prober container (run the previous step first to create a docker network!)**
    - Navigate to `Jujuby/Scripts` and run `sudo bash manual_run.sh SERVERID COUNTRY`.
    - `SERVERID` can be found using `curl --silent "https://api.nordvpn.com/v1/servers" | jq --raw-output '.[].hostname' | sort --version-sort`. Each line returned is in the format `SERVERID.nordvpn.com`, e.g., `us9263.nordvpn.com`. 
    - `COUNTRY` is the country corresponding to the country code within the `SERVERID` 
    - You should also have the `jujuby_controller_1` container also up and running. If not, then refer to **Step 2**. 
    - We will need to use the controller to signal the prober container to start probing. Type `docker exec -it jujuby_controller_1 bash`. If you see a new shell session, this means you are successfully using the controller container shell.
    - Using the controller container shell, type `curl PROBER_NAME:3000/api/pool/start` where `PROBER_NAME` is the name of the prober container. Typically it is named using the format `probe-manual-SERVERID`, but you can run `docker ps -a` to make sure.
    - To stop a prober container, use the controller container shell to send a request: `curl PROBER_NAME:3000/api/pool/stop` to stop the crawling process and ensure a graceful container shutdown. 
    - References as to what APIs the prober container has can be found in `Jujuby/Prober/app.js`.
 
## Common Use Cases 
### Manually starting multiple prober containers 
### Using and importing utility modules 
### Accessing the database 


## FAQS
- **How can I modify the prober container?**
- **How is the probing conducted?** 
- **Twitch is returning 401 unauthorized errors when called**
- **Can Docker resume to my shell after running a container?** 
- **Can Docker-compose resume to my shell after running a container?** 
- **How can I modify the database schema?** 
- **Where can I backup the database data?** 
- **How is the data written to the database?**