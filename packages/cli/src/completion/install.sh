# dev installation script
sudo mkdir -p /usr/local/etc/bash_completion.d/
sudo ln -s $PWD/si /etc/bash_completion.d/si
sudo ln -s $PWD/../bin/index.ts /usr/local/bin/si
source /etc/bash_completion.d/si