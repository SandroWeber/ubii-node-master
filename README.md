# ubii-nodejs-backend

## Project setup


### Windows pre-requisists before "npm install"

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

Alternatives:

- certbot (https://certbot.eff.org/)
- greenlock (https://www.npmjs.com/package/greenlock)

### Enable HTTPS

- In `config.json` set useHTTPS to `true`.