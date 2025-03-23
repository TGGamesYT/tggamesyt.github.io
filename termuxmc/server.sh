#!/bin/bash
# run the code below in termux to have yourself
# a papermc/minecraft server running on your own
# android device!
# wget https://tggamesyt.github.io/termuxmc/server.sh -O server.sh && chmod +x server.sh && ./server.sh

# installing depencies and updating everything
pkg install wget curl jq bash -y
pkg update
hash -r
wget https://tggamesyt.github.io/termuxmc/conf.sh -O conf.sh && chmod +x conf.sh
echo "please run ./conf.sh to continue"
rm -- "$0"
