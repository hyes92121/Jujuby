#! /bin/bash
docker build -t nslab/prober:2.0 --build-arg NORDVPN_VERSION=3.7.4 -f Dockerfile.prober .