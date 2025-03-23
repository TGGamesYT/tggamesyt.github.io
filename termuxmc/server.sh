#!/bin/bash
# run the code below in termux to have yourself
# a papermc/minecraft server running on your own
# android device!
# wget https://tggamesyt.github.io/termuxmc/start.sh -O start.sh && chmod +x start.sh && ./start.sh

# installing depencies and updating everything
pkg install wget curl jq bash -y
pkg update
hash -r
wget https://tggamesyt.github.io/termuxmc/conf.sh -O start.sh && chmod +x conf.sh && ./conf.sh
rm -- "$0"
