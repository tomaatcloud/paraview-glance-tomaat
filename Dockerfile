FROM ubuntu:16.04

RUN apt-get -y update
RUN apt-get -y upgrade

RUN apt-get install -y apache2 nano psmisc npm git curl

RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -
RUN apt-get install -y nodejs

WORKDIR "/workspace"

RUN git clone https://github.com/tomaatcloud/paraview-glance-tomaat.git

WORKDIR "/workspace/paraview-glance-tomaat"

RUN npm install
RUN npm run build
RUN cp -R dist/* /var/www/html


