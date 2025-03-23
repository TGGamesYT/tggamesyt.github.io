# RUN THE FOLLOWING COMMAND TO HAVE A MINECRAFT SERVER RUNNING IN TERMUX:
# wget -O setup.sh https://tggamesyt.github.io/mcserver_termux.sh && chmod +x setup.sh
# AND THAN
# ./setup.sh
# update before anything, things might be outdated
pkg update -y

# java version, change if needed
pkg install openjdk-21 -y

# minecraft jar, currently paper 1.21, change if needed
wget https://api.papermc.io/v2/projects/paper/versions/1.21/builds/130/downloads/paper-1.21-130.jar

# eula
echo "eula=true" > eula.txt

# create the startup file - you will execute this to start the server
echo "#!/bin/bash" > start.sh

# get the location of the right java version and apply it
# change if needed
echo "export JAVA_HOME=/data/data/com.termux/files/usr/lib/jvm/java-21-openjdk" >> start.sh
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> start.sh

# normal startup command
echo "java -Xms512M -Xmx1G -jar paper-1.21-130.jar nogui" >> start.sh

# make the file executable
chmod +x start.sh

# optional, but make a file to install the playit.gg plugins,
# which allows you to connect to this server without
# needing to port forward, which is hard to do.
echo 'mkdir plugins' > playitgg.sh
echo 'cd plugins' >> playitgg.sh
echo 'wget https://github.com/playit-cloud/playit-minecraft-plugin/releases/latest/download/playit-minecraft-plugin.jar' >> playitgg.sh
echo 'cd ..' >> playitgg.sh
echo 'rm -- "$0"' >> playitgg.sh
chmod +x playitgg.sh

echo "THANKS FOR USING"
echo "TGGAMESYT'S MINECRAFT SERVER"
echo "SETUP SCRIPT!"
echo "YOU CAN CONSIDER DONATING AT"
echo "https://ko-fi.com/tggamesyt"


# delete this file
rm -- "$0"