# ubii-node-master

## Project setup

### Node.js

Install Node.js v14.15.X (https://nodejs.org/en/download/).

### Windows pre-requisists

#### windows build tools

from admin shell:

```
npm install -g windows-build-tools
```

if it complains about not being able to find v140 of build tools, try

```
npm install --vs2015 -g windows-build-tools
```

also see: https://www.npmjs.com/package/zeromq

#### CMake

install from https://cmake.org/download/

### install dependencies

```
npm install
```

### run with default config

Create a copy of "config.json.template" called "config.json" and adjust settings to your needs (or keep as is). Then run:

```
npm start
```

## HTTPS setup

### How to create your own HTTPS certification

- Install mkcert (https://github.com/FiloSottile/mkcert)
- Run `mkcert -install`, this will create root certificate files and set everything up for you to sign your own certificates
  When later trying to connect to the frontend from remote machines, you might need to import these root certificates in the remote machine browser under authorities. Otherwise the browser might regard any socket connection over HTTPS as unsafe, even if you add an exception.
- Running `mkcert ubii.com "*.ubii.com" ubii.test localhost 127.0.0.1 <host-ip-address> ::1` will give you 2 .pem files
- Copy .pem files to path-to-backend-folder/certificates

OR (under development)

- run script "createSelfsignedCertificates.js" with (multiple) options -n="<your domain name / IP>"

Alternatives:

- certbot (https://certbot.eff.org/)
- greenlock (https://www.npmjs.com/package/greenlock)

### Enable HTTPS

- In `config.json` set things up under "https"
- enable by setting to "true"
- set paths to your certificates


### CORS / allowed origins policies
- add IPs / URLs of allowed origins for CORS (usually the machine running your web frontend / other web clients) to your config.json
- localhost and local IPs are automatically added, if you want web communication from outside you need to configure it manually

## Debugging

### NodeJS inspection
- start the master node via "npm run start-profiling" (will run with additional command-line flags "--inspect")
- in Chrome browser, go to "about:inspect"
- click "Open dedicated DevTools for Node" or select your process from the remote target list
- Tab "Profiler" allows you to check CPU execution time
- Tab "Sources" allows you to set breakpoints and debug execution

### Topic Communication
- use the tools offered in the web-frontend: https://github.com/SandroWeber/ubii-web-frontend
