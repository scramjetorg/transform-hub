# Scramjet Transform Hub Systemd Service

1. Install Scramjet Transform Hub `npm i -g @scramjet/sth @scramjet/cli --prefix /usr/local/bin`
2. Create file: `/etc/systemd/system/scramjet-transform-hub.service`
3. Insert with content of [scramjet-transform-hub.service](scramjet-transform-hub.service)
4. Start service `systemctl start scramjet-transform-hub.service`
5. Check status of service `systemctl status scramjet-transform-hub.service`
6. Stop service `systemctl start scramjet-transform-hub.service`
7. Get service logs: `journalctl -u scramjet-transform-hub`
8. To start service automatically after server restart you can enable service: `systemctl enable scramjet-transform-hub.service`
