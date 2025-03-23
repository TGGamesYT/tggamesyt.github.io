echo "please specify the link of the jar file you want to run."
read -p "url: " jarfile
echo "please send here the java version you want to use!"
read -p "a number: " javaver

# update before anything, things might be outdated
pkg update -y

# java version, change if needed
pkg install openjdk-$javaver -y

# minecraft jar, currently paper 1.21, change if needed
wget -O server.jar $jarfile

# eula
echo "eula=true" > eula.txt

# create the startup file - you will execute this to start the server
echo "#!/bin/bash" > start.sh

# get the location of the right java version and apply it
# change if needed
echo "export JAVA_HOME=/data/data/com.termux/files/usr/lib/jvm/java-$javaver-openjdk" >> start.sh
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> start.sh

# normal startup command
echo "java -Xms512M -Xmx1G -jar server.jar nogui" >> start.sh

# make the file executable
chmod +x start.sh

# optional, but make a file to install the playit.gg plugins,
# which allows you to connect to this server without
# needing to port forward, which is hard to do.
echo 'mkdir plugins' > playitgg.sh
echo 'cd plugins' >> playitgg.sh
echo 'wget https://github.com/playit-cloud/playit-minecraft-plugin/releases/latest/download/playit-minecraft-plugin.jar' >> playitg>
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