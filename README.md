# Jujuby
Jujuby is a crawler that leverages Twitch internal mechanisms and VPNs to discover content servers hosting Twitch streams. Jujuby can be run directly on the host machine to send requests from your local network, or run in a Docker container to proxy requests through VPN servers. 

## Getting Started 
### Prerequisites: 
Before starting, make sure the following prerequisites are installed on your machine: 
- [Node.js](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions)
- npm
- [docker](https://docs.docker.com/engine/install/ubuntu/)
- [docker-compose](https://docs.docker.com/compose/install/)

First, we need to setup our credentials and project paths. Naviagte to `Jujuby/.envfiles` and modify `variables.env`. You should only change `NORD_USER`, `NORD_PWD`, and `PROJECT_ROOT` and leave the other variables as is.  

Next, we will need to unzip our dataset which also happens to contain the password for our crawler UI. The dataset should be [downloaded]() to the project root. 
Under the project root, type `tar -zxvf MongoData.tgz`. This folder is mounted to the database container and stores all data of the database. 

Should you decide to use a clean database, a folder named `MongoData` is still required. Type `mkdir MongoData` under the project root to create the folder. 

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
    - Break condition of the algorithm can be customized. *Note: this module is not currently used in the latest code base.* 

### Running in Docker 
*Note: Running the crawler using docker is to enable multiple simultaneous VPN connections on our host machine. Only do this if you require sending requests to Twitch from different network locations at once.*
- **Step 1: Build a prober container**
    - Under the project root, type `docker build -t nslab/prober:2.0 --build-arg NORDVPN_VERSION=3.7.4 -f Dockerfiles/Dockerfile.prober .`
    - Please ensure that the image name is correctly tagged as `nslab/prober:2.0`, as other scripts depend on this image to work properly. 
    - You can type `docker images` to make sure that the image is correctly tagged. 

- **Step 2: Build utility containers and Jujuby UI**
    - Under the project root, type `docker-compose up -d`. 
    - This will start the UI server as well as the Mongo database. 
    - By default, the UI is run on `140.112.42.160:22222`. 
    - The username and password should be provided to you explicitly. 
    - This will build and start three containers, `jujuby_controller_1`, `mongodb`, and `cache`. Note that `cache` is currently not used, but can be implemented to reduce network traffic and prevent repetitive requests. 

- **Step 3: Connect to a VPN server and start crawling (run the previous step first to create a docker network!)**
    - *Choosing a VPN server:*
        - Before crawling, we need to first choose a VPN server that we would like our container to connect to. We need two variables, `SERVERID` and `COUNTRY` to start a prober container.  
        - A VPN server's `SERVERID` can be found using `curl --silent "https://nordvpn.com/api/server" | jq '.[] | .domain' | sort --version-sort | sed 's/"//g'`. Each line returned is in the format `SERVERID.nordvpn.com`, e.g., `us9263.nordvpn.com`. 
        - `COUNTRY` is the country corresponding to the country code within the `SERVERID`. 
    - *Starting a prober container connected to the VPN server:*
        - Having determined `SERVERID` and `COUNTRY`, navigate to `Jujuby/Scripts` and run `sudo bash manual_run.sh SERVERID COUNTRY`.
        - If the connection to the VPN server is successful, you should see something like `You are connected to COUNTRY #ID (SERVERID.nordvpn.com)`. 
        - At the end of the screen, you should see the prompt staying at `ProbingPool listening at http://localhost:3000`. This means the container is ready to accept controller requests. 
    - *Starting the prober container:*
        - We will need to use the controller to signal the prober container to start probing. Open up a new shell session and type `docker exec -it jujuby_controller_1 bash`. If you see a new shell session, this means you are successfully executing the controller container shell.
        - Using the controller container shell, type `curl PROBER_NAME:3000/api/pool/start` where `PROBER_NAME` is the name of the prober container. Typically it is named using the format `probe-manual-SERVERID`, but you can run `docker ps -a` to make sure.
        - You should see probing logs on the prober container's shell. This indicates that the prober has started the crawling process. 
    - *Stopping the prober container:*
        - To stop a prober container, use the controller container shell to send a request: `curl PROBER_NAME:3000/api/pool/stop` to stop the crawling process and ensure a graceful container shutdown. 
        - References as to what APIs the prober container has can be found in `Jujuby/Prober/app.js`.
 
## Common Use Cases 
### Setting which stream languages and what percentages to crawl 
- **Selecting stream languages**
    - [This website](https://twitchtracker.com/languages) compiles a list of languages that are currently live on Twitch. Chosen languages should be coverted to its corresponding language code according to [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes). E.g., the language code for *Chinese* is `zh`. 
- **Setting stream languages and viewer percentages**
    - Inside `Jujuby/Scripts/manual_run.sh` are two variables that determine the stream langauges and percentages to crawl. `LANGUAGE` is a string of language codes separated by commas, e.g. `LANGUAGES='zh,en,es,ko,fr'`. `PERCENTAGES` is a string of intergers separated by commas, e.g. `PERCENTAGES='80,60,60,80,80'`. 80 in this case denotes 80\% of viewers. The number of language codes should be the same as the number of percentages. 
    If using the UI, you should be able to set the stream language percentage using a slidebar.
### Manually starting multiple prober containers 
- **Using a terminal multiplexer**
    - I highly recommend using a terminal multiplexer such as `tmux` or `screen` to do this, as you would be able to monitor the logs of each prober container this way. 
- **Choosing multiple VPN servers**
    - Deciding which VPN servers to use is totally up to you. Be aware though, that one NordVPN subscription (this is what I use) can only have up to 6 connections at once. More than that and you would need another VPN subscription. 
- **Running all containers**
    - Run `Jujuby/Scripts/manual_run.sh` for each VPN connection. Next, run `docker ps` to see their container names. 
    - Execute controller container shell and run `curl PROBER_NAME:3000/api/pool/start` for each prober container. 
### Accessing the database 
*Note: when starting the Mongo container, the volume `Jujuby/MongoData` is mounted to the container and is where all data is written.* 
- **Using a Mongo Shell**
    - Run `docker exec -it mongodb mongo` to execute the mongo shell. 
- **Using a Program**

    *Note: we mapped port 27017 of the database container to port 8888 of the host machine due to security reasons.* 
    - This code snippet should provide a general idea of how to access the database.
    ```python
    from pymongo import MongoClient
    from pprint import pprint

    client = MongoClient('localhost:8888')
    db = client.Twitch
    serverStatusResult = db.command('serverStatus')

    streams = db.United_States.find({"channel": "relaxing234"})
    for s in streams:
        pprint(s)
    ```


## FAQS
- **How is the probing conducted?** 
    - All the main logic of the prober is written in `Jujuby/Prober/src/Probe.js`. The rest of the code base are mainly utility functions that serve as modules for `Probe.js`. 
- **How can I modify the behavior of the prober?**
    - I would recommend first understanding `Jujuby/Prober/src/Probe.js`. All the main logic of the prober is written in the file. It would be easy to customize the prober's behavior once you get a hold of what the file does. 
- **Twitch is returning 401 unauthorized errors when called.**
    - We need an **access token** to request from Twitch's API. Receiving a 401 error means that the token has expired and requires a new one. Refer to the `RENEWING AN ACCESS TOKEN` section in `Jujuby/Prober/src/Api.js`
- **Can docker resume to my shell after running a container?** 
    - Run `docker run -d` to detach from the container shell after running one. 
- **Can I see the logs of docker-compose ?** 
    - Run `docker-compose up` without the `-d` flag, which stands for `detach`. 
- **How is the data written to the database?**
    - Please refer to the `writeTransaction()` method in `Jujuby/Prober/src/Probe.js`. 
- **How can I modify the database schema?** 
    - Since we're using a noSQL database (MongoDB), we can easily insert a document with a new schema. Simply modify the `writeTransaction()` method in `Jujuby/Prober/src/Probe.js` to fit to your needs. 
- **Where can I backup the database data?** 
    - All database data is written in `Jujuby/MongoData`. Simply keep a copy of the folder and your data is backed up and can be restored at anytime. 

## Author 
*Caleb Wang*
- [github/hyes92121](https://github.com/hyes92121)

## License 
Copyright &copy; [Caleb Wang](https://github.com/hyes92121). Released under the [MIT license](https://github.com/hyes92121/Jujuby/blob/master/LICENSE). 