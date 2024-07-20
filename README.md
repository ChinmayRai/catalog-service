# Product catalog Service
This is backend service which exposes a REST API for a catalog of products
It uses express as the backend API server and uses mysql as its DB.
We have configured a replica of the source DB, so the reads are done exclusively on the replica, where as writes are done on source DB.

## Running the app
After cloning the repo, install all dependencies:
```
npm run install
```
build the image:
```
docker compose build
```
start the containers in detached mode:
```
docker compose up -d
```
configure source for replication:
```
docker exec -it mysql-master bash

mysql -uroot --password=root
select @@bind_address, @@server_id, @@log_bin;

ALTER USER 'replication_user'@'%' IDENTIFIED WITH 'mysql_native_password' BY 'replication_password';
GRANT REPLICATION SLAVE ON *.* TO 'replication_user'@'%';
FLUSH PRIVILEGES;
SHOW BINARY LOG STATUS;
```

configure replica for repliation:
```
docker exec -it mysql-slave bash

mysql -uroot --password=root
select @@bind_address, @@server_id, @@log_bin, @@relay_log;

CHANGE REPLICATION SOURCE TO
SOURCE_HOST='mysql-master',
SOURCE_USER='replication_user',
SOURCE_PASSWORD='replication_password',
SOURCE_LOG_FILE='mysql-bin.00000X',
SOURCE_LOG_POS=XXXX;

START REPLICA;
SHOW REPLICA STATUS\G;
```

## References
1. [running replication on docker](https://dev.to/siddhantkcode/how-to-set-up-a-mysql-master-slave-replication-in-docker-4n0a)